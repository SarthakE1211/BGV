"use server";

// Thin action shell over src/lib/services/checks.service.ts.

import { z } from "zod";

import { requireAuth } from "@/src/lib/auth.helpers";
import { setCheckStatus } from "@/src/lib/services/checks.service";
import { toActionResult, type ErrorCode } from "@/src/lib/errors";
import { invalidateCheck } from "@/src/lib/revalidation";
import { sendEmail } from "@/src/lib/email";
import { queryOne } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
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
    | { ok: false; error: string; code?: ErrorCode };

async function run(
    checkId: string,
    newStatus: CheckStatus,
    remarks: string | null
): Promise<CheckActionResult> {
    const user = await requireAuth();
    try {
        const result = await setCheckStatus(checkId, newStatus, remarks, user);

        void enqueueCheckEmail(result.requestId, newStatus, result.newRequestStatus).catch((err) =>
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
    const row = await queryOne<{ email: string }>(
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
