"use server";

// Thin action shell over src/lib/services/blacklist.service.ts.

import { z } from "zod";

import { requireAuth } from "@/src/lib/auth.helpers";
import { blacklistCandidateByCheck } from "@/src/lib/services/blacklist.service";
import { toActionResult, type ErrorCode } from "@/src/lib/errors";
import { invalidateBlacklist } from "@/src/lib/revalidation";
import { sendEmail } from "@/src/lib/email";
import { queryOne } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";

const Schema = z.object({
    checkId: z.string().min(1, "checkId required"),
    reason: z.string().trim().min(5, "Reason is required (min 5 chars)").max(2000),
});

export type BlacklistResult =
    | { ok: true; requestId: string }
    | { ok: false; error: string; code?: ErrorCode };

export async function blacklistCandidate(input: {
    checkId: string;
    reason: string;
}): Promise<BlacklistResult> {
    const user = await requireAuth();

    const parsed = Schema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    const { checkId, reason } = parsed.data;

    try {
        const result = await blacklistCandidateByCheck(checkId, reason, user);

        void enqueueBlacklistedEmail(result.requestId).catch((err) =>
            logger.error("email.CANDIDATE_BLACKLISTED failed", {
                err,
                requestId: result.requestId,
            })
        );

        invalidateBlacklist(result.requestId);
        return { ok: true, requestId: result.requestId };
    } catch (e) {
        return toActionResult(e);
    }
}

async function enqueueBlacklistedEmail(requestId: string) {
    const row = await queryOne<{ email: string }>(
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
