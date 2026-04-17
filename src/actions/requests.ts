"use server";

// Thin action shell over src/lib/services/requests.service.ts.
// Responsibilities here: auth, input validation, revalidation, side-effects
// (email dispatch). The transactional body lives in the service.

import { z } from "zod";

import { requireAuth } from "@/src/lib/auth.helpers";
import {
    createRequest,
    approveRequest as approveRequestService,
} from "@/src/lib/services/requests.service";
import { AppError, toActionResult, type ErrorCode } from "@/src/lib/errors";
import { invalidateRequest } from "@/src/lib/revalidation";
import { pool, query } from "@/src/lib/db";
import { sendEmail } from "@/src/lib/email";
import { logger } from "@/src/lib/logger";
import { cuid } from "@/src/lib/ids";
import type { BlacklistMatch } from "@/src/lib/blacklist";
import {
    requestSubmittedEmail,
    requestApprovedEmail,
    candidateInitiatedEmail,
    candidateLetterIssuedEmail,
} from "@/src/lib/email-templates";
import { getRequestDetail, getRequestChecks } from "@/src/lib/request-detail";
import { renderClearanceLetterHtml, letterBlobName } from "@/src/lib/letter";
import { uploadTextSafe, isBlobConfigured } from "@/src/lib/blob";
import {
    getTemplate,
    renderClearanceDocx,
    setRequestLetterDocx,
    CLEARANCE_TEMPLATE_KEY,
} from "@/src/lib/templates";

const InputSchema = z.object({
    candidateName: z.string().trim().min(1, "Name is required").max(191),
    candidateEmail: z.string().trim().email("Valid email required"),
    candidatePhone: z.string().trim().max(64).optional().or(z.literal("")),
    candidateDob: z.string().optional().or(z.literal("")), // yyyy-mm-dd
    partnerId: z.string().min(1, "Partner is required"),
    clientAccount: z.string().trim().max(191).optional().or(z.literal("")),
    roleType: z.enum(["FTE_W2", "PRO", "DISPATCH", "BACKFILL"]),
    region: z.enum(["USA", "CANADA", "LATAM"]),
    priority: z.enum(["NORMAL", "MEDIUM", "HIGH"]).default("NORMAL"),
    notes: z.string().max(2000).optional().or(z.literal("")),
    assignedSpecialistId: z.string().optional().or(z.literal("")),
});

export type CreateBGVRequestInput = z.infer<typeof InputSchema>;

export type CreateBGVRequestResult =
    | { ok: true; requestId: string; requestNumber: string }
    | { ok: false; error: string; code?: ErrorCode; field?: string }
    | {
          ok: false;
          error: "BLACKLISTED";
          match: {
              matchType: "EMAIL" | "NAME";
              candidateName: string;
              candidateEmail: string;
              failedCheck: string;
              reason: string;
          };
      };

export async function createBGVRequest(
    raw: CreateBGVRequestInput
): Promise<CreateBGVRequestResult> {
    const user = await requireAuth();

    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return { ok: false, error: first.message, field: first.path.join(".") };
    }

    try {
        const result = await createRequest(
            {
                ...parsed.data,
                candidatePhone: parsed.data.candidatePhone || null,
                candidateDob: parsed.data.candidateDob || null,
                partnerClientId: null,
                clientAccount: parsed.data.clientAccount || null,
                notes: parsed.data.notes || null,
                assignedSpecialistId: parsed.data.assignedSpecialistId || null,
            },
            user
        );

        void sendRequestSubmittedEmails(
            result.requestId,
            result.requestNumber,
            parsed.data,
            user
        ).catch((err) =>
            logger.error("email.REQUEST_SUBMITTED failed", { err, requestId: result.requestId })
        );

        invalidateRequest(result.requestId);
        return { ok: true, requestId: result.requestId, requestNumber: result.requestNumber };
    } catch (e) {
        if (e instanceof AppError && e.code === "BLACKLISTED") {
            const { match } = e.details as { match: BlacklistMatch };
            return {
                ok: false,
                error: "BLACKLISTED",
                match: {
                    matchType: match.matchType,
                    candidateName: match.candidateName,
                    candidateEmail: match.candidateEmail,
                    failedCheck: match.failedCheck,
                    reason: match.reason,
                },
            };
        }
        return toActionResult(e);
    }
}

export async function approveRequest(requestId: string) {
    const user = await requireAuth();
    await approveRequestService(requestId, user);
    invalidateRequest(requestId);
}

/** Specialist / HR Head picks up a PENDING request. Self-assigns, flips the
 *  status to IN_PROGRESS, and records initiation_date. No-ops if the request
 *  is not PENDING so a double-click can't clobber existing state. */
export async function initiateRequest(
    requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const user = await requireAuth();
    if (user.role !== "SPECIALIST" && user.role !== "HR_HEAD") {
        return { ok: false, error: "Only Specialists or HR Head can initiate a BGV request" };
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [result] = await conn.execute(
            `UPDATE bgv_requests
             SET status = 'IN_PROGRESS',
                 assigned_specialist_id = ?,
                 initiation_date = NOW(3)
             WHERE id = ? AND status = 'PENDING'`,
            [user.id, requestId]
        );
        const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
        if (affected === 0) {
            await conn.rollback();
            return { ok: false, error: "Request is not pending or no longer exists" };
        }

        // Pre-assign all checks to the initiating specialist so the Tracker
        // view lines up with the request-level ownership.
        await conn.execute(
            `UPDATE bgv_checks SET assigned_to_id = ? WHERE bgv_request_id = ?`,
            [user.id, requestId]
        );

        await conn.execute(
            `INSERT INTO activity_logs (id, bgv_request_id, performed_by_id, action, details)
             VALUES (?, ?, ?, 'REQUEST_INITIATED', ?)`,
            [cuid(), requestId, user.id, `Initiated by ${user.name} (${user.role})`]
        );

        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    // Fire-and-forget candidate notification (SOP step 19 in FTE's). Async so
    // a slow / failing Graph call never blocks the specialist's action.
    void sendCandidateInitiatedEmail(requestId).catch((err) =>
        logger.error("email.CANDIDATE_INITIATED failed", { err, requestId })
    );

    invalidateRequest(requestId);
    return { ok: true };
}

export async function updateClientAccount(
    requestId: string,
    clientAccount: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const user = await requireAuth();
    if (user.role === "SPECIALIST") {
        return { ok: false, error: "Not authorized" };
    }
    const value = clientAccount.trim() || null;
    const conn = await pool.getConnection();
    try {
        await conn.execute(
            "UPDATE bgv_requests SET client_account = ? WHERE id = ?",
            [value, requestId]
        );
    } finally {
        conn.release();
    }
    invalidateRequest(requestId);
    return { ok: true };
}

/** HR_HEAD issues the BGV clearance letter. Renders the letter HTML from
 *  current request data, writes it immutably to `letter_html` + sets
 *  `letter_issued_date = NOW()`, then best-effort uploads a copy to Azure
 *  Blob Storage for archival. The DB row is the source of truth; the Blob
 *  copy is archival and doesn't block success if Azure is unavailable. */
export async function generateClearanceLetter(
    requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        return { ok: false, error: "Only HR Head can generate the clearance letter" };
    }

    // 1. Snapshot: fetch current request + checks to freeze into the letter.
    const [request, checks] = await Promise.all([
        getRequestDetail(requestId, user.role, user.id),
        getRequestChecks(requestId),
    ]);
    if (!request) {
        return { ok: false, error: "Request not found" };
    }
    if (request.status !== "GREEN" || !request.approvedBy) {
        return { ok: false, error: "Request must be GREEN and approved before issuing the letter" };
    }

    const html = renderClearanceLetterHtml(request, checks);

    // 2. Atomic DB write: letter_html + issued_date + activity log.
    //    Guarded by status + approved + not-already-issued to prevent races.
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [result] = await conn.execute(
            `UPDATE bgv_requests
             SET letter_issued_date = NOW(3), letter_html = ?
             WHERE id = ?
               AND status = 'GREEN'
               AND approved_by_id IS NOT NULL
               AND letter_issued_date IS NULL`,
            [html, requestId]
        );
        const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
        if (affected === 0) {
            await conn.rollback();
            return { ok: false, error: "Clearance letter already issued or request no longer eligible" };
        }

        await conn.execute(
            `INSERT INTO activity_logs (id, bgv_request_id, performed_by_id, action, details)
             VALUES (?, ?, ?, 'LETTER_ISSUED', ?)`,
            [cuid(), requestId, user.id, `Clearance letter generated by ${user.name}`]
        );
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    // 2.5. If HR has uploaded a .docx template via /settings, render a
    //      populated copy and store the bytes on the request row. Runs
    //      best-effort — an invalid template shouldn't block letter issuance
    //      since the HTML snapshot is already committed above.
    try {
        const tpl = await getTemplate(CLEARANCE_TEMPLATE_KEY);
        if (tpl) {
            const docxBytes = renderClearanceDocx(tpl.bytes, request, checks);
            await setRequestLetterDocx(requestId, docxBytes);
        }
    } catch (err) {
        logger.error("letter.docx render failed", { err, requestId });
    }

    // 3. Best-effort Blob upload + persist the resulting URL. Runs async so a
    //    slow / failing Azure call never blocks the HR Head's action. When the
    //    URL is back, we notify the candidate with a link to the issued letter.
    if (isBlobConfigured()) {
        const blobName = letterBlobName(request.requestNumber, request.candidate.name);
        void uploadTextSafe(blobName, html).then(async (url) => {
            if (!url) {
                // Even without a Blob URL, still notify the candidate — SDM will share.
                void sendCandidateLetterIssuedEmail(requestId, null).catch((err) =>
                    logger.error("email.CANDIDATE_LETTER_ISSUED failed", { err, requestId })
                );
                return;
            }
            try {
                const c = await pool.getConnection();
                try {
                    await c.execute(
                        `UPDATE bgv_requests SET letter_blob_url = ? WHERE id = ?`,
                        [url, requestId]
                    );
                } finally {
                    c.release();
                }
            } catch (err) {
                logger.error("letter.blob_url persist failed", { err, requestId });
            }
            void sendCandidateLetterIssuedEmail(requestId, url).catch((err) =>
                logger.error("email.CANDIDATE_LETTER_ISSUED failed", { err, requestId })
            );
        });
    } else {
        // No Blob configured — candidate still gets notified (without a link).
        void sendCandidateLetterIssuedEmail(requestId, null).catch((err) =>
            logger.error("email.CANDIDATE_LETTER_ISSUED failed", { err, requestId })
        );
    }

    invalidateRequest(requestId);
    return { ok: true };
}

/** HR_HEAD final sign-off on a completed (GREEN) BGV request.
 *  Sets approved_by_id without changing the status. */
export async function signOffRequest(requestId: string): Promise<void> {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        throw new Error("Only HR Head can approve BGV records");
    }
    const conn = await pool.getConnection();
    try {
        await conn.execute(
            `UPDATE bgv_requests SET approved_by_id = ? WHERE id = ? AND approved_by_id IS NULL`,
            [user.id, requestId]
        );
    } finally {
        conn.release();
    }

    // Notify the SDM who submitted the request
    void sendSignOffEmail(requestId, user.name).catch((err) =>
        logger.error("email.SIGN_OFF failed", { err, requestId })
    );

    invalidateRequest(requestId);
}

// ── Email helpers ──────────────────────────────────────────────────────────────

async function sendRequestSubmittedEmails(
    requestId: string,
    requestNumber: string,
    data: {
        candidateName: string;
        candidateEmail: string;
        partnerId: string;
        clientAccount?: string | null;
        roleType: string;
        region: string;
    },
    submitter: { name: string; email: string }
) {
    // Look up partner name + code, and get all HR_HEADs and Specialists
    const [partnerRow, stakeHolders] = await Promise.all([
        query<{ code: string; name: string }>(
            `SELECT code, name FROM partners WHERE id = ? LIMIT 1`,
            [data.partnerId]
        ),
        query<{ email: string }>(
            `SELECT email FROM users WHERE role IN ('HR_HEAD','SPECIALIST')`
        ),
    ]);

    const partner = partnerRow[0] ?? { code: "—", name: "—" };
    const { subject, html } = requestSubmittedEmail({
        requestNumber,
        candidateName: data.candidateName,
        candidateEmail: data.candidateEmail,
        partnerName: partner.name,
        partnerCode: partner.code,
        clientAccount: data.clientAccount ?? null,
        roleType: data.roleType,
        region: data.region,
        submittedByName: submitter.name,
    });

    // Notify HR_HEADs + Specialists (not the SDM who submitted — they already know)
    const recipients = stakeHolders.map((r) => r.email)
        .filter((e, i, a) => a.indexOf(e) === i);

    for (const recipient of recipients) {
        await sendEmail({ trigger: "REQUEST_SUBMITTED", requestId, recipient, subject, body: html, bodyType: "HTML" });
    }
}

async function sendSignOffEmail(requestId: string, approverName: string) {
    const row = await query<{
        request_number: string;
        candidate_name: string;
        partner_code: string;
        sdm_email: string;
    }>(
        `SELECT
            r.request_number,
            c.name  AS candidate_name,
            p.code  AS partner_code,
            u.email AS sdm_email
         FROM bgv_requests r
         JOIN candidates c ON c.id = r.candidate_id
         JOIN partners   p ON p.id = r.partner_id
         JOIN users      u ON u.id = r.submitted_by_id
         WHERE r.id = ? LIMIT 1`,
        [requestId]
    );
    if (!row[0]) return;
    const r = row[0];
    const { subject, html } = requestApprovedEmail({
        requestNumber: r.request_number,
        candidateName: r.candidate_name,
        partnerCode: r.partner_code,
        approvedByName: approverName,
    });
    await sendEmail({
        trigger: "REQUEST_APPROVED",
        requestId,
        recipient: r.sdm_email,
        subject,
        body: html,
        bodyType: "HTML",
    });
}

/** Candidate-facing email fired after a BGV is initiated (SOP step 19 for
 *  FTE's). Looks up candidate + partner + SDM + region → chooses the DISA
 *  or PreciseHire variant → sends once and logs. */
async function sendCandidateInitiatedEmail(requestId: string): Promise<void> {
    const row = await query<{
        candidate_name: string;
        candidate_email: string;
        partner_name: string;
        client_account: string | null;
        client_name: string | null;
        region: string;
        bgv_vendor: "DISA" | "PRECISEHIRE";
        sdm_name: string;
        sdm_email: string;
    }>(
        `SELECT
            c.name  AS candidate_name,
            c.email AS candidate_email,
            p.name  AS partner_name,
            r.client_account,
            pc.client_name,
            r.region,
            r.bgv_vendor,
            u.name  AS sdm_name,
            u.email AS sdm_email
         FROM bgv_requests r
         JOIN candidates c  ON c.id = r.candidate_id
         JOIN partners   p  ON p.id = r.partner_id
         JOIN users      u  ON u.id = r.submitted_by_id
         LEFT JOIN partner_clients pc ON pc.id = r.partner_client_id
         WHERE r.id = ? LIMIT 1`,
        [requestId]
    );
    const data = row[0];
    if (!data || !data.candidate_email) return;

    const { subject, html } = candidateInitiatedEmail({
        candidateName: data.candidate_name,
        partnerName: data.partner_name,
        clientAccount: data.client_account ?? data.client_name ?? null,
        region: data.region,
        bgvVendor: data.bgv_vendor,
        sdmName: data.sdm_name,
        sdmEmail: data.sdm_email,
    });

    await sendEmail({
        trigger: "CANDIDATE_INITIATED",
        requestId,
        recipient: data.candidate_email,
        subject,
        body: html,
        bodyType: "HTML",
    });
}

/** Candidate-facing email fired when the BGV clearance letter is issued.
 *  `letterUrl` is the Azure Blob URL if available, else null (SDM will share). */
async function sendCandidateLetterIssuedEmail(
    requestId: string,
    letterUrl: string | null
): Promise<void> {
    const row = await query<{
        request_number: string;
        candidate_name: string;
        candidate_email: string;
        partner_name: string;
        client_account: string | null;
        client_name: string | null;
        sdm_name: string;
        sdm_email: string;
    }>(
        `SELECT
            r.request_number,
            c.name  AS candidate_name,
            c.email AS candidate_email,
            p.name  AS partner_name,
            r.client_account,
            pc.client_name,
            u.name  AS sdm_name,
            u.email AS sdm_email
         FROM bgv_requests r
         JOIN candidates c  ON c.id = r.candidate_id
         JOIN partners   p  ON p.id = r.partner_id
         JOIN users      u  ON u.id = r.submitted_by_id
         LEFT JOIN partner_clients pc ON pc.id = r.partner_client_id
         WHERE r.id = ? LIMIT 1`,
        [requestId]
    );
    const data = row[0];
    if (!data || !data.candidate_email) return;

    const { subject, html } = candidateLetterIssuedEmail({
        candidateName: data.candidate_name,
        partnerName: data.partner_name,
        clientAccount: data.client_account ?? data.client_name ?? null,
        requestNumber: data.request_number,
        letterUrl,
        sdmName: data.sdm_name,
        sdmEmail: data.sdm_email,
    });

    await sendEmail({
        trigger: "CANDIDATE_LETTER_ISSUED",
        requestId,
        recipient: data.candidate_email,
        subject,
        body: html,
        bodyType: "HTML",
    });
}
