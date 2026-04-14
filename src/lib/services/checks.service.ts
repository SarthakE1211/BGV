// Individual BGV check state transitions (clear / fail).

import type { RowDataPacket } from "mysql2";
import { tx } from "@/src/lib/db";
import { cuid } from "@/src/lib/ids";
import { recalcStatus } from "@/src/lib/check-status";
import { AppError } from "@/src/lib/errors";
import type { AuthedUser } from "@/src/lib/auth.helpers";
import type { CheckStatus } from "@/src/lib/enums";

export interface SetCheckStatusResult {
    requestId: string;
    newRequestStatus: string;
}

export async function setCheckStatus(
    checkId: string,
    newStatus: CheckStatus,
    remarks: string | null,
    actor: AuthedUser
): Promise<SetCheckStatusResult> {
    if (actor.role !== "SPECIALIST" && actor.role !== "HR_HEAD") {
        throw new AppError("FORBIDDEN", "Only Specialists or HR Head can update checks");
    }

    return tx(async (conn) => {
        const [checkRows] = await conn.execute<
            (RowDataPacket & {
                id: string;
                bgv_request_id: string;
                check_type: string;
                status: CheckStatus;
            })[]
        >(
            `SELECT id, bgv_request_id, check_type, status
             FROM bgv_checks WHERE id = ? LIMIT 1`,
            [checkId]
        );
        if (checkRows.length === 0) throw new AppError("NOT_FOUND", "Check not found");
        const check = checkRows[0];

        await conn.execute(
            `UPDATE bgv_checks
             SET status = ?,
                 started_at  = COALESCE(started_at, NOW(3)),
                 completed_at = NOW(3),
                 remarks = ?
             WHERE id = ?`,
            [newStatus, remarks, checkId]
        );

        const [siblings] = await conn.execute<(RowDataPacket & { status: CheckStatus })[]>(
            `SELECT status FROM bgv_checks WHERE bgv_request_id = ?`,
            [check.bgv_request_id]
        );

        const [reqRows] = await conn.execute<(RowDataPacket & { status: string })[]>(
            `SELECT status FROM bgv_requests WHERE id = ? LIMIT 1`,
            [check.bgv_request_id]
        );
        const currentStatus = reqRows[0]?.status;

        let newRequestStatus = currentStatus;
        if (currentStatus !== "BLACKLISTED") {
            newRequestStatus = recalcStatus(siblings.map((s) => ({ status: s.status })));
            const completionDateExpr =
                newRequestStatus === "GREEN" ? "NOW(3)" : "completion_date";
            await conn.execute(
                `UPDATE bgv_requests
                 SET status = ?, completion_date = ${completionDateExpr}
                 WHERE id = ?`,
                [newRequestStatus, check.bgv_request_id]
            );
        }

        await conn.execute(
            `INSERT INTO activity_logs (id, bgv_request_id, performed_by_id, action, details)
             VALUES (?, ?, ?, ?, ?)`,
            [
                cuid(),
                check.bgv_request_id,
                actor.id,
                newStatus === "CLEARED" ? "CHECK_CLEARED" : "CHECK_FAILED",
                remarks ? `${check.check_type} — ${remarks}` : check.check_type,
            ]
        );

        return { requestId: check.bgv_request_id, newRequestStatus };
    });
}
