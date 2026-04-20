"use server";

// Server actions for BGV requests. Calls Django REST API instead of
// direct SQL. Email sending is handled by Django — removed from here.

import { z } from "zod";

import { requireAuth } from "@/src/lib/auth.helpers";
import { api, ApiError } from "@/src/lib/api-client";
import { invalidateRequest } from "@/src/lib/revalidation";
import type { ErrorCode } from "@/src/lib/errors";

const InputSchema = z.object({
    candidateName: z.string().trim().min(1, "Name is required").max(191),
    candidateEmail: z.string().trim().email("Valid email required"),
    candidatePhone: z.string().trim().max(64).optional().or(z.literal("")),
    candidateDob: z.string().optional().or(z.literal("")), // yyyy-mm-dd
    partnerId: z.string().min(1, "Partner is required"),
    clientAccount: z.string().trim().max(191).optional().or(z.literal("")),
    roleType: z.enum(["FTE_W2", "PRO", "DISPATCH", "BACKFILL"]),
    region: z.enum(["USA", "CANADA", "LATAM"]),
    priority: z.enum(["NORMAL", "MEDIUM", "HIGH"]).default("NORMAL"),
    notes: z.string().max(2000).optional().or(z.literal("")),
    assignedSpecialistId: z.string().optional().or(z.literal("")),
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
        const result = await api<{
            id: string;
            request_id?: string;
            requestId?: string;
            request_number?: string;
            requestNumber?: string;
        }>("/bgv/requests/", {
            method: "POST",
            userId: user.id,
            body: {
                ...parsed.data,
                candidatePhone: parsed.data.candidatePhone || null,
                candidateDob: parsed.data.candidateDob || null,
                clientAccount: parsed.data.clientAccount || null,
                notes: parsed.data.notes || null,
                assignedSpecialistId:
                    parsed.data.assignedSpecialistId || null,
            },
        });

        const requestId =
            result.request_id ?? result.requestId ?? result.id ?? "";
        const requestNumber =
            result.request_number ?? result.requestNumber ?? "";

        invalidateRequest(requestId);
        return { ok: true, requestId, requestNumber };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
            if (body && body.error === "BLACKLISTED" && body.match) {
                const m = body.match as Record<string, string>;
                return {
                    ok: false,
                    error: "BLACKLISTED",
                    match: {
                        matchType: (m.matchType ?? m.match_type ?? "EMAIL") as
                            | "EMAIL"
                            | "NAME",
                        candidateName:
                            m.candidateName ?? m.candidate_name ?? "",
                        candidateEmail:
                            m.candidateEmail ?? m.candidate_email ?? "",
                        failedCheck:
                            m.failedCheck ?? m.failed_check ?? "",
                        reason: m.reason ?? "",
                    },
                };
            }
            return {
                ok: false,
                error:
                    (body?.error as string) ??
                    (body?.detail as string) ??
                    e.message,
                code: (body?.code as ErrorCode) ?? undefined,
            };
        }
        return {
            ok: false,
            error:
                e instanceof Error
                    ? e.message
                    : "An unexpected error occurred",
        };
    }
}

export async function approveRequest(requestId: string) {
    const user = await requireAuth();
    await api(`/bgv/requests/${requestId}/approve/`, {
        method: "POST",
        userId: user.id,
    });
    invalidateRequest(requestId);
}

/** Specialist / HR Head picks up a PENDING request. */
export async function initiateRequest(
    requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const user = await requireAuth();
    if (user.role !== "SPECIALIST" && user.role !== "HR_HEAD") {
        return {
            ok: false,
            error: "Only Specialists or HR Head can initiate a BGV request",
        };
    }

    try {
        await api(`/bgv/requests/${requestId}/initiate/`, {
            method: "POST",
            userId: user.id,
        });
        invalidateRequest(requestId);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
            return {
                ok: false,
                error:
                    (body?.error as string) ??
                    (body?.detail as string) ??
                    e.message,
            };
        }
        return {
            ok: false,
            error:
                e instanceof Error
                    ? e.message
                    : "An unexpected error occurred",
        };
    }
}

export async function updateClientAccount(
    requestId: string,
    clientAccount: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const user = await requireAuth();
    if (user.role === "SPECIALIST") {
        return { ok: false, error: "Not authorized" };
    }

    try {
        await api(`/bgv/requests/${requestId}/`, {
            method: "PATCH",
            userId: user.id,
            body: { client_account: clientAccount.trim() || null },
        });
        invalidateRequest(requestId);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
            return {
                ok: false,
                error:
                    (body?.error as string) ??
                    (body?.detail as string) ??
                    e.message,
            };
        }
        return {
            ok: false,
            error:
                e instanceof Error
                    ? e.message
                    : "An unexpected error occurred",
        };
    }
}

/** HR_HEAD issues the BGV clearance letter. Django handles rendering,
 *  blob upload, and candidate notification. */
export async function generateClearanceLetter(
    requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        return {
            ok: false,
            error: "Only HR Head can generate the clearance letter",
        };
    }

    try {
        await api(`/bgv/requests/${requestId}/generate_letter/`, {
            method: "POST",
            userId: user.id,
        });
        invalidateRequest(requestId);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
            return {
                ok: false,
                error:
                    (body?.error as string) ??
                    (body?.detail as string) ??
                    e.message,
            };
        }
        return {
            ok: false,
            error:
                e instanceof Error
                    ? e.message
                    : "An unexpected error occurred",
        };
    }
}

/** HR_HEAD final sign-off on a completed (GREEN) BGV request. */
export async function signOffRequest(requestId: string): Promise<void> {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        throw new Error("Only HR Head can approve BGV records");
    }
    await api(`/bgv/requests/${requestId}/approve/`, {
        method: "POST",
        userId: user.id,
    });
    invalidateRequest(requestId);
}
