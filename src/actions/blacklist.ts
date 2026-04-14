"use server";

// blacklistCandidate(checkId, reason) — 4 writes in one transaction:
//   1. INSERT blacklist_entries
//   2. UPDATE candidates.is_blacklisted = 1
//   3. UPDATE bgv_requests.status = 'BLACKLISTED'
//   4. INSERT activity_logs
// Email send is fire-and-forget (chunk 6 wires real Graph send).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";

import { requireAuth } from "@/src/lib/auth.helpers";
import { tx } from "@/src/lib/db";
import { cuid } from "@/src/lib/ids";

const Schema = z.object({
    checkId: z.string().min(1, "checkId required"),
    reason: z.string().trim().min(5, "Reason is required (min 5 chars)").max(2000),
});

export type BlacklistResult =
    | { ok: true; requestId: string }
    | { ok: false; error: string };

export async function blacklistCandidate(input: {
    checkId: string;
    reason: string;
}): Promise<BlacklistResult> {
    const user = await requireAuth();
    if (user.role !== "SPECIALIST" && user.role !== "HR_HEAD") {
        return { ok: false, error: "Forbidden — only Specialists or HR Head can blacklist" };
    }

    const parsed = Schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { checkId, reason } = parsed.data;

    const result = await tx(async (conn) => {
        // Locate the check + parent request + candidate
        const [rows] = await conn.execute<
            (RowDataPacket & {
                check_id: string;
                check_type: string;
                request_id: string;
                candidate_id: string;
            })[]
        >(
            `SELECT c.id AS check_id, c.check_type, r.id AS request_id, r.candidate_id
             FROM bgv_checks c
             JOIN bgv_requests r ON r.id = c.bgv_request_id
             WHERE c.id = ? LIMIT 1`,
            [checkId]
        );
        if (rows.length === 0) throw new Error("Check not found");
        const { check_type, request_id, candidate_id } = rows[0];

        // 1. Blacklist entry (idempotent on bgv_request_id via unique key)
        const blEntryId = cuid();
        await conn.execute(
            `INSERT INTO blacklist_entries
                 (id, candidate_id, bgv_request_id, failed_check, reason, blacklisted_by_id)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 reason = VALUES(reason),
                 failed_check = VALUES(failed_check),
                 blacklisted_by_id = VALUES(blacklisted_by_id)`,
            [blEntryId, candidate_id, request_id, check_type, reason, user.id]
        );

        // 2. Flag candidate
        await conn.execute(
            `UPDATE candidates SET is_blacklisted = 1 WHERE id = ?`,
            [candidate_id]
        );

        // 3. Force request status
        await conn.execute(
            `UPDATE bgv_requests SET status = 'BLACKLISTED' WHERE id = ?`,
            [request_id]
        );

        // 4. Activity log
        await conn.execute(
            `INSERT INTO activity_logs (id, bgv_request_id, performed_by_id, action, details)
             VALUES (?, ?, ?, 'BLACKLISTED', ?)`,
            [cuid(), request_id, user.id, `${check_type} — ${reason}`]
        );

        return { requestId: request_id };
    });

    void enqueueBlacklistedEmail(result.requestId).catch((e) =>
        console.error("[email] CANDIDATE_BLACKLISTED failed:", e)
    );

    revalidatePath("/tracker");
    revalidatePath(`/requests/${result.requestId}`);
    revalidatePath("/requests");
    revalidatePath("/blacklist");
    revalidatePath("/dashboard");

    return { ok: true, requestId: result.requestId };
}

import { sendEmail } from "@/src/lib/email";
import { queryOne as _queryOne } from "@/src/lib/db";

async function enqueueBlacklistedEmail(requestId: string) {
    const row = await _queryOne<{ email: string }>(
        `SELECT u.email
         FROM bgv_requests r
         JOIN users u ON u.id = r.submitted_by_id
         WHERE r.id = ? LIMIT 1`,
        [requestId]
    );
    if (!row?.email) return;
    await sendEmail({
        trigger: "CANDIDATE_BLACKLISTED",
        requestId,
        recipient: row.email,
        subject: "Candidate has been blacklisted",
    });
}
