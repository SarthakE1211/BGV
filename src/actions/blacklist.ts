"use server";

import { z } from "zod";

import { requireAuth } from "@/src/lib/auth.helpers";
import { api, ApiError } from "@/src/lib/api-client";
import { type ErrorCode } from "@/src/lib/errors";
import { invalidateBlacklist } from "@/src/lib/revalidation";

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
        const result = await api<{ request_id: string }>(
            `/bgv/checks/${checkId}/blacklist/`,
            {
                method: "POST",
                body: { reason },
                userId: user.id,
            }
        );

        invalidateBlacklist(result.request_id);
        return { ok: true, requestId: result.request_id };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
            const msg = (body?.error as string) || e.message;
            const code: ErrorCode =
                e.status === 404 ? "NOT_FOUND" :
                e.status === 422 ? "BLACKLISTED" :
                e.status === 403 ? "FORBIDDEN" :
                "INTERNAL";
            return { ok: false, error: msg, code };
        }
        return { ok: false, error: "Unexpected error" };
    }
}
