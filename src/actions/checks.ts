"use server";

// Server actions for BGV checks. Calls Django REST API instead of direct SQL.
// Email sending is handled by Django — removed from here.

import { z } from "zod";

import { requireAuth } from "@/src/lib/auth.helpers";
import { api, ApiError } from "@/src/lib/api-client";
import { invalidateCheck } from "@/src/lib/revalidation";
import type { ErrorCode } from "@/src/lib/errors";

const PassSchema = z.object({
    checkId: z.string().min(1),
    remarks: z.string().max(2000).optional().or(z.literal("")),
});

const FailSchema = z.object({
    checkId: z.string().min(1),
    remarks: z
        .string()
        .trim()
        .min(3, "Failure remarks are required (min 3 chars)")
        .max(2000),
});

export type CheckActionResult =
    | { ok: true; requestId: string; newRequestStatus: string }
    | { ok: false; error: string; code?: ErrorCode };

export async function clearCheck(input: {
    checkId: string;
    remarks?: string;
}): Promise<CheckActionResult> {
    const parsed = PassSchema.safeParse(input);
    if (!parsed.success)
        return { ok: false, error: parsed.error.issues[0].message };

    const user = await requireAuth();
    try {
        const result = await api<{
            request_id?: string;
            requestId?: string;
            new_request_status?: string;
            newRequestStatus?: string;
        }>(`/bgv/checks/${parsed.data.checkId}/clear/`, {
            method: "POST",
            userId: user.id,
            body: { remarks: parsed.data.remarks?.trim() || null },
        });

        const requestId =
            result.request_id ?? result.requestId ?? "";
        const newRequestStatus =
            result.new_request_status ?? result.newRequestStatus ?? "";

        invalidateCheck(requestId);
        return { ok: true, requestId, newRequestStatus };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
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

export async function failCheck(input: {
    checkId: string;
    remarks: string;
}): Promise<CheckActionResult> {
    const parsed = FailSchema.safeParse(input);
    if (!parsed.success)
        return { ok: false, error: parsed.error.issues[0].message };

    const user = await requireAuth();
    try {
        const result = await api<{
            request_id?: string;
            requestId?: string;
            new_request_status?: string;
            newRequestStatus?: string;
        }>(`/bgv/checks/${parsed.data.checkId}/fail/`, {
            method: "POST",
            userId: user.id,
            body: { remarks: parsed.data.remarks.trim() },
        });

        const requestId =
            result.request_id ?? result.requestId ?? "";
        const newRequestStatus =
            result.new_request_status ?? result.newRequestStatus ?? "";

        invalidateCheck(requestId);
        return { ok: true, requestId, newRequestStatus };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
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

export async function assignSpecialistToRequest(
    requestId: string,
    specialistId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    const user = await requireAuth();
    if (user.role === "SDM") return { ok: false, error: "Not authorized" };

    try {
        await api(`/bgv/requests/${requestId}/assign_specialist/`, {
            method: "POST",
            userId: user.id,
            body: { specialist_id: specialistId || null },
        });
        invalidateCheck(requestId);
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
