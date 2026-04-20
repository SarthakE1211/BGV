"use server";

// HR_HEAD-only admin actions for the Partners & Checks configuration page.
// Calls Django REST API instead of direct SQL.

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/src/lib/auth.helpers";
import { api, ApiError } from "@/src/lib/api-client";

const ChecksInput = z.object({
    partnerId: z.string().min(1),
    checks: z
        .array(z.string().trim().min(1).max(64))
        .max(50, "Too many checks (max 50)"),
});

export type UpdateStandardChecksResult =
    | { ok: true }
    | { ok: false; error: string };

/** Replace a partner's `standard_checks` JSON array. HR_HEAD only.
 *  Empty strings and duplicates are filtered out server-side. */
export async function updatePartnerStandardChecks(
    raw: { partnerId: string; checks: string[] }
): Promise<UpdateStandardChecksResult> {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        return {
            ok: false,
            error: "Only HR Head can edit partner configuration",
        };
    }

    const parsed = ChecksInput.safeParse(raw);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0].message };
    }

    // Normalize: trim, dedupe case-insensitively, preserve first-seen casing.
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const c of parsed.data.checks) {
        const key = c.trim().toUpperCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        normalized.push(c.trim());
    }

    try {
        await api(
            `/partners/config/${parsed.data.partnerId}/standard_checks/`,
            {
                method: "PATCH",
                userId: user.id,
                body: { standard_checks: normalized },
            }
        );
        revalidatePath("/partners");
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
