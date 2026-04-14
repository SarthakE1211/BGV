// Blacklist a candidate based on a failed check.

import type { RowDataPacket } from "mysql2";
import { tx } from "@/src/lib/db";
import { cuid } from "@/src/lib/ids";
import { AppError } from "@/src/lib/errors";
import type { AuthedUser } from "@/src/lib/auth.helpers";

export interface BlacklistResult {
    requestId: string;
}

export async function blacklistCandidateByCheck(
    checkId: string,
    reason: string,
    actor: AuthedUser
): Promise<BlacklistResult> {
    if (actor.role !== "SPECIALIST" && actor.role !== "HR_HEAD") {
        throw new AppError("FORBIDDEN", "Only Specialists or HR Head can blacklist");
    }

    return tx(async (conn) => {
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
        if (rows.length === 0) throw new AppError("NOT_FOUND", "Check not found");
        const { check_type, request_id, candidate_id } = rows[0];

        await conn.execute(
            `INSERT INTO blacklist_entries
                 (id, candidate_id, bgv_request_id, failed_check, reason, blacklisted_by_id)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 reason = VALUES(reason),
                 failed_check = VALUES(failed_check),
                 blacklisted_by_id = VALUES(blacklisted_by_id)`,
            [cuid(), candidate_id, request_id, check_type, reason, actor.id]
        );

        await conn.execute(
            `UPDATE candidates SET is_blacklisted = 1 WHERE id = ?`,
            [candidate_id]
        );

        await conn.execute(
            `UPDATE bgv_requests SET status = 'BLACKLISTED' WHERE id = ?`,
            [request_id]
        );

        await conn.execute(
            `INSERT INTO activity_logs (id, bgv_request_id, performed_by_id, action, details)
             VALUES (?, ?, ?, 'BLACKLISTED', ?)`,
            [cuid(), request_id, actor.id, `${check_type} — ${reason}`]
        );

        return { requestId: request_id };
    });
}
