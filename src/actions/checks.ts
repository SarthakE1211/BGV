"use server";

// Pass / Fail server actions for individual BGV checks.
// Only SPECIALIST and HR_HEAD may write. Each call:
//   1. UPDATE bgv_checks (status + completed_at + remarks)
//   2. SELECT all sibling checks for the request, recompute aggregate status
//   3. UPDATE bgv_requests.status (skipped if currently BLACKLISTED)
//   4. INSERT activity_logs row
//   5. revalidatePath the tracker + detail page
// Email send is fire-and-forget, stubbed for chunk 6.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";

import { requireAuth } from "@/src/lib/auth.helpers";
import { tx } from "@/src/lib/db";
import { cuid } from "@/src/lib/ids";
import { recalcStatus } from "@/src/lib/check-status";
import type { CheckStatus } from "@/src/lib/enums";

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
    | { ok: false; error: string };

async function setCheckStatus(
    checkId: string,
    newStatus: CheckStatus,
    remarks: string | null
): Promise<CheckActionResult> {
    const user = await requireAuth();
    if (user.role !== "SPECIALIST" && user.role !== "HR_HEAD") {
        return { ok: false, error: "Forbidden — only Specialists or HR Head can update checks" };
    }

    const result = await tx(async (conn) => {
        // Look up the check + parent request
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
        if (checkRows.length === 0) throw new Error("Check not found");
        const check = checkRows[0];

        // Update the check
        await conn.execute(
            `UPDATE bgv_checks
             SET status = ?,
                 started_at  = COALESCE(started_at, NOW(3)),
                 completed_at = NOW(3),
                 remarks = ?
             WHERE id = ?`,
            [newStatus, remarks, checkId]
        );

        // Re-fetch all sibling checks to recompute the aggregate status
        const [siblings] = await conn.execute<
            (RowDataPacket & { status: CheckStatus })[]
        >(`SELECT status FROM bgv_checks WHERE bgv_request_id = ?`, [check.bgv_request_id]);

        // Read current request status (don't override BLACKLISTED)
        const [reqRows] = await conn.execute<
            (RowDataPacket & { status: string })[]
        >(`SELECT status FROM bgv_requests WHERE id = ? LIMIT 1`, [check.bgv_request_id]);
        const currentStatus = reqRows[0]?.status;

        let newRequestStatus = currentStatus;
        if (currentStatus !== "BLACKLISTED") {
            newRequestStatus = recalcStatus(
                siblings.map((s) => ({ status: s.status }))
            );
            const completionDateExpr =
                newRequestStatus === "GREEN" ? "NOW(3)" : "completion_date";
            await conn.execute(
                `UPDATE bgv_requests
                 SET status = ?, completion_date = ${completionDateExpr}
                 WHERE id = ?`,
                [newRequestStatus, check.bgv_request_id]
            );
        }

        // Activity log
        await conn.execute(
            `INSERT INTO activity_logs (id, bgv_request_id, performed_by_id, action, details)
             VALUES (?, ?, ?, ?, ?)`,
            [
                cuid(),
                check.bgv_request_id,
                user.id,
                newStatus === "CLEARED" ? "CHECK_CLEARED" : "CHECK_FAILED",
                remarks
                    ? `${check.check_type} — ${remarks}`
                    : check.check_type,
            ]
        );

        return { requestId: check.bgv_request_id, newRequestStatus };
    });

    // Email side-effect (stubbed; chunk 6)
    void enqueueCheckEmail(result.requestId, newStatus, result.newRequestStatus).catch(
        (e) => console.error("[email] check email failed:", e)
    );

    revalidatePath("/tracker");
    revalidatePath(`/requests/${result.requestId}`);
    revalidatePath("/requests");
    revalidatePath("/dashboard");

    return {
        ok: true,
        requestId: result.requestId,
        newRequestStatus: result.newRequestStatus,
    };
}

export async function clearCheck(input: {
    checkId: string;
    remarks?: string;
}): Promise<CheckActionResult> {
    const parsed = PassSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    return setCheckStatus(parsed.data.checkId, "CLEARED", parsed.data.remarks?.trim() || null);
}

export async function failCheck(input: {
    checkId: string;
    remarks: string;
}): Promise<CheckActionResult> {
    const parsed = FailSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    return setCheckStatus(parsed.data.checkId, "FAILED", parsed.data.remarks.trim());
}

import { sendEmail } from "@/src/lib/email";
import { queryOne as _queryOne } from "@/src/lib/db";

async function enqueueCheckEmail(
    requestId: string,
    checkStatus: CheckStatus,
    requestStatus: string
) {
    const trigger =
        requestStatus === "GREEN"
            ? "ALL_CHECKS_GREEN"
            : checkStatus === "CLEARED"
              ? "CHECK_CLEARED"
              : "CHECK_FAILED";
    // Resolve the SDM email for this request
    const row = await _queryOne<{ email: string }>(
        `SELECT u.email
         FROM bgv_requests r
         JOIN users u ON u.id = r.submitted_by_id
         WHERE r.id = ? LIMIT 1`,
        [requestId]
    );
    if (!row?.email) return;
    await sendEmail({
        trigger,
        requestId,
        recipient: row.email,
        subject:
            trigger === "ALL_CHECKS_GREEN"
                ? "All BGV checks cleared"
                : trigger === "CHECK_CLEARED"
                  ? "BGV check cleared"
                  : "BGV check failed",
    });
}
