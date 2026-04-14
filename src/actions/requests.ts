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
import { sendEmail } from "@/src/lib/email";
import { logger } from "@/src/lib/logger";
import type { BlacklistMatch } from "@/src/lib/blacklist";

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
                partnerClientId: parsed.data.partnerClientId || null,
                notes: parsed.data.notes || null,
            },
            user
        );

        void sendEmail({
            trigger: "REQUEST_SUBMITTED",
            requestId: result.requestId,
            recipient: user.email,
            subject: "BGV Request submitted",
        }).catch((err) =>
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
