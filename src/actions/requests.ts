"use server";

// New BGV Request submission. Five-step flow per BGV_Integration_Guide:
//   1. Blacklist check (FIRST — abort if matched, nothing written)
//   2. Candidate upsert by email
//   3. INSERT bgv_requests with generated request number
//   4. INSERT bgv_checks (one per resolved check type)
//   5. INSERT activity_logs + revalidate (email send is fire-and-forget,
//      stubbed for now and wired in chunk 6)
//
// The DB writes (steps 2–5) run inside a single transaction so a failure
// anywhere rolls back cleanly.

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/src/lib/auth.helpers";
import { pool, queryOne, tx } from "@/src/lib/db";
import { cuid, requestNumber } from "@/src/lib/ids";
import { resolveCheckMatrix } from "@/src/lib/check-matrix";
import { findBlacklistMatch } from "@/src/lib/blacklist";
import { Region, Priority, RoleType } from "@/src/lib/enums";

// ─── Input validation ────────────────────────────────────────────────────────
const InputSchema = z.object({
    candidateName: z.string().trim().min(1, "Name is required").max(191),
    candidateEmail: z.string().trim().email("Valid email required"),
    candidatePhone: z.string().trim().max(64).optional().or(z.literal("")),
    candidateDob: z.string().optional().or(z.literal("")), // yyyy-mm-dd
    partnerId: z.string().min(1, "Partner is required"),
    partnerClientId: z.string().optional().or(z.literal("")),
    roleType: z.enum(["FTE_W2", "PRO", "DISPATCH", "BACKFILL"]),
    region: z.enum(["USA", "CANADA", "LATAM"]),
    priority: z.enum(["NORMAL", "MEDIUM", "HIGH"]).default("NORMAL"),
    notes: z.string().max(2000).optional().or(z.literal("")),
});

export type CreateBGVRequestInput = z.infer<typeof InputSchema>;

export type CreateBGVRequestResult =
    | { ok: true; requestId: string; requestNumber: string }
    | { ok: false; error: string; field?: string }
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

// ─── Action ──────────────────────────────────────────────────────────────────
export async function createBGVRequest(
    raw: CreateBGVRequestInput
): Promise<CreateBGVRequestResult> {
    const user = await requireAuth();

    // 0. Validate input shape
    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return {
            ok: false,
            error: first.message,
            field: first.path.join("."),
        };
    }
    const input = parsed.data;
    const partnerClientId = input.partnerClientId?.trim() || null;
    const dob = input.candidateDob && input.candidateDob.trim() ? input.candidateDob : null;

    // 1. Blacklist gate — runs first, no rows written if matched
    const match = await findBlacklistMatch(input.candidateName, input.candidateEmail);
    if (match) {
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

    // Resolve final check list before opening the transaction so failures
    // surface early and we don't hold a connection longer than needed.
    const checks = await resolveCheckMatrix(input.partnerId, partnerClientId, input.region as Region);
    if (checks.length === 0) {
        return {
            ok: false,
            error: "No checks configured for this partner/client/region combination",
            field: "partnerId",
        };
    }

    const bgvVendor = input.region === "CANADA" ? "PRECISEHIRE" : "DISA";

    // 2–5. All writes in one transaction
    const result = await tx(async (conn) => {
        // 2. Candidate upsert (look up by email; create if absent)
        const [existingRows] = await conn.execute<
            (import("mysql2").RowDataPacket & { id: string })[]
        >(
            `SELECT id FROM candidates WHERE LOWER(email) = LOWER(?) LIMIT 1`,
            [input.candidateEmail]
        );

        let candidateId: string;
        if (existingRows.length) {
            candidateId = existingRows[0].id;
        } else {
            candidateId = cuid();
            await conn.execute(
                `INSERT INTO candidates (id, name, email, phone, date_of_birth, is_blacklisted)
                 VALUES (?, ?, ?, ?, ?, 0)`,
                [
                    candidateId,
                    input.candidateName,
                    input.candidateEmail,
                    input.candidatePhone || null,
                    dob,
                ]
            );
        }

        // 3. Generate request number — count existing requests for this year
        const year = new Date().getUTCFullYear();
        const [seqRows] = await conn.execute<
            (import("mysql2").RowDataPacket & { n: number })[]
        >(
            `SELECT COUNT(*) AS n FROM bgv_requests
             WHERE request_number LIKE ?`,
            [`BGV-${year}-%`]
        );
        const reqNum = requestNumber(year, Number(seqRows[0]?.n ?? 0) + 1);

        // 3b. Create the request row
        const requestId = cuid();
        await conn.execute(
            `INSERT INTO bgv_requests
                 (id, request_number, candidate_id, partner_id, partner_client_id,
                  submitted_by_id, role_type, region, bgv_vendor, status, priority,
                  bgv_type, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
            [
                requestId,
                reqNum,
                candidateId,
                input.partnerId,
                partnerClientId,
                user.id,
                input.roleType,
                input.region,
                bgvVendor,
                input.priority,
                partnerClientId ? "CUSTOM" : "STANDARD",
                input.notes || null,
            ]
        );

        // 4. Create one bgv_checks row per resolved check type
        for (const c of checks) {
            await conn.execute(
                `INSERT INTO bgv_checks
                     (id, bgv_request_id, check_type, requirement_source, status)
                 VALUES (?, ?, ?, ?, 'PENDING')`,
                [cuid(), requestId, c.checkType, c.source]
            );
        }

        // 5. Activity log
        await conn.execute(
            `INSERT INTO activity_logs
                 (id, bgv_request_id, performed_by_id, action, details)
             VALUES (?, ?, ?, 'REQUEST_SUBMITTED', ?)`,
            [
                cuid(),
                requestId,
                user.id,
                `Blacklist: CLEAR. ${checks.length} check${checks.length === 1 ? "" : "s"} loaded.`,
            ]
        );

        return { requestId, requestNumber: reqNum };
    });

    // Email send is fire-and-forget; stub for now (chunk 6 wires real SMTP/Graph).
    void enqueueRequestSubmittedEmail(result.requestId, user.email).catch((err) => {
        console.error("[email] REQUEST_SUBMITTED enqueue failed:", err);
    });

    revalidatePath("/requests");
    revalidatePath("/dashboard");

    return { ok: true, requestId: result.requestId, requestNumber: result.requestNumber };
}

// ─── Approve action (unchanged from previous chunks; raw SQL now) ────────────
export async function approveRequest(requestId: string) {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") throw new Error("Forbidden: HR_HEAD only");

    const row = await queryOne<{ id: string }>(
        `SELECT id FROM bgv_requests WHERE id = ? LIMIT 1`,
        [requestId]
    );
    if (!row) throw new Error("Request not found");

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.execute(
            `UPDATE bgv_requests
             SET status = 'IN_PROGRESS', approved_by_id = ?, initiation_date = NOW(3)
             WHERE id = ?`,
            [user.id, requestId]
        );
        await conn.execute(
            `INSERT INTO activity_logs (id, bgv_request_id, performed_by_id, action, details)
             VALUES (?, ?, ?, 'REQUEST_APPROVED', ?)`,
            [cuid(), requestId, user.id, `Approved by ${user.name} (HR_HEAD)`]
        );
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }

    revalidatePath("/requests");
    revalidatePath(`/requests/${requestId}`);
}

// ─── Email gateway dispatch ──────────────────────────────────────────────────
import { sendEmail } from "@/src/lib/email";

async function enqueueRequestSubmittedEmail(requestId: string, recipient: string) {
    await sendEmail({
        trigger: "REQUEST_SUBMITTED",
        requestId,
        recipient,
        subject: "BGV Request submitted",
    });
}
