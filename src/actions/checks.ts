"use server";

// Thin action shell over src/lib/services/checks.service.ts.

import { z } from "zod";

import { requireAuth } from "@/src/lib/auth.helpers";
import { setCheckStatus } from "@/src/lib/services/checks.service";
import { toActionResult, type ErrorCode } from "@/src/lib/errors";
import { invalidateCheck } from "@/src/lib/revalidation";
import { sendEmail } from "@/src/lib/email";
import { pool, query, queryOne } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import type { CheckStatus } from "@/src/lib/enums";
import {
    checkClearedEmail,
    checkFailedEmail,
    allChecksGreenEmail,
} from "@/src/lib/email-templates";

const PassSchema = z.object({
    checkId: z.string().min(1),
    remarks: z.string().max(2000).optional().or(z.literal("")),
});

const FailSchema = z.object({
    checkId: z.string().min(1),
    remarks: z.string().trim().min(3, "Failure remarks are required (min 3 chars)").max(2000),
});

export type CheckActionResult =
    | { ok: true; requestId: string; newRequestStatus: string }
    | { ok: false; error: string; code?: ErrorCode };

async function run(
    checkId: string,
    newStatus: CheckStatus,
    remarks: string | null
): Promise<CheckActionResult> {
    const user = await requireAuth();
    try {
        const result = await setCheckStatus(checkId, newStatus, remarks, user);

        void enqueueCheckEmail(result.requestId, checkId, newStatus, result.newRequestStatus, user.name).catch((err) =>
            logger.error("email.check failed", { err, requestId: result.requestId })
        );

        invalidateCheck(result.requestId);
        return {
            ok: true,
            requestId: result.requestId,
            newRequestStatus: result.newRequestStatus,
        };
    } catch (e) {
        return toActionResult(e);
    }
}

export async function clearCheck(input: {
    checkId: string;
    remarks?: string;
}): Promise<CheckActionResult> {
    const parsed = PassSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    return run(parsed.data.checkId, "CLEARED", parsed.data.remarks?.trim() || null);
}

export async function failCheck(input: {
    checkId: string;
    remarks: string;
}): Promise<CheckActionResult> {
    const parsed = FailSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    return run(parsed.data.checkId, "FAILED", parsed.data.remarks.trim());
}

export async function assignSpecialistToRequest(
    requestId: string,
    specialistId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const user = await requireAuth();
    if (user.role === "SDM") return { ok: false, error: "Not authorized" };

    const value = specialistId || null;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.execute(
            "UPDATE bgv_requests SET assigned_specialist_id = ? WHERE id = ?",
            [value, requestId]
        );
        // Keep per-check ownership in sync so the Tracker view matches.
        await conn.execute(
            "UPDATE bgv_checks SET assigned_to_id = ? WHERE bgv_request_id = ?",
            [value, requestId]
        );
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
    invalidateCheck(requestId);
    return { ok: true };
}

async function enqueueCheckEmail(
    requestId: string,
    checkId: string,
    checkStatus: CheckStatus,
    requestStatus: string,
    actorName: string
) {
    // Fetch request + check context in one go
    const row = await queryOne<{
        request_number: string;
        candidate_name: string;
        candidate_email: string;
        partner_code: string;
        partner_name: string;
        client_account: string | null;
        client_name: string | null;
        role_type: string;
        region: string;
        sdm_email: string;
        specialist_email: string | null;
        check_type: string;
        remarks: string | null;
    }>(
        `SELECT
            r.request_number,
            c.name  AS candidate_name,
            c.email AS candidate_email,
            p.code  AS partner_code,
            p.name  AS partner_name,
            COALESCE(r.client_account, pc.client_name) AS client_account,
            pc.client_name,
            r.role_type,
            r.region,
            u.email AS sdm_email,
            asp.email AS specialist_email,
            ch.check_type,
            ch.remarks
         FROM bgv_requests r
         JOIN candidates c  ON c.id = r.candidate_id
         JOIN partners   p  ON p.id = r.partner_id
         JOIN users      u  ON u.id = r.submitted_by_id
         LEFT JOIN users  asp ON asp.id = r.assigned_specialist_id
         LEFT JOIN partner_clients pc ON pc.id = r.partner_client_id
         JOIN bgv_checks ch ON ch.id = ?
         WHERE r.id = ?
         LIMIT 1`,
        [checkId, requestId]
    );
    if (!row) return;

    // Recipients: SDM who submitted + assigned specialist + all HR_HEADs
    const hrHeads = await query<{ email: string }>(
        `SELECT email FROM users WHERE role = 'HR_HEAD'`
    );
    const recipients = [
        row.sdm_email,
        row.specialist_email ?? "",
        ...hrHeads.map((h) => h.email),
    ].filter((e, i, a) => e && a.indexOf(e) === i);  // deduplicate

    const trigger =
        requestStatus === "GREEN"
            ? "ALL_CHECKS_GREEN"
            : checkStatus === "CLEARED"
              ? "CHECK_CLEARED"
              : "CHECK_FAILED";

    let subject: string;
    let html: string;

    if (trigger === "ALL_CHECKS_GREEN") {
        ({ subject, html } = allChecksGreenEmail({
            requestNumber: row.request_number,
            candidateName: row.candidate_name,
            candidateEmail: row.candidate_email,
            partnerCode: row.partner_code,
            partnerName: row.partner_name,
            clientAccount: row.client_account,
            roleType: row.role_type,
            region: row.region,
        }));
    } else if (trigger === "CHECK_CLEARED") {
        ({ subject, html } = checkClearedEmail({
            requestNumber: row.request_number,
            candidateName: row.candidate_name,
            checkType: row.check_type,
            remarks: row.remarks,
            specialistName: actorName,
        }));
    } else {
        ({ subject, html } = checkFailedEmail({
            requestNumber: row.request_number,
            candidateName: row.candidate_name,
            checkType: row.check_type,
            remarks: row.remarks ?? "No reason provided",
            specialistName: actorName,
        }));
    }

    for (const recipient of recipients) {
        await sendEmail({ trigger, requestId, recipient, subject, body: html, bodyType: "HTML" });
    }
}
