"use server";

// HR_HEAD-only admin actions for the Partners & Checks configuration page.

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/src/lib/auth.helpers";
import { execute, queryOne } from "@/src/lib/db";

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
        return { ok: false, error: "Only HR Head can edit partner configuration" };
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

    const exists = await queryOne<{ id: string }>(
        `SELECT id FROM partners WHERE id = ? LIMIT 1`,
        [parsed.data.partnerId]
    );
    if (!exists) {
        return { ok: false, error: "Partner not found" };
    }

    await execute(
        `UPDATE partners SET standard_checks = ? WHERE id = ?`,
        [JSON.stringify(normalized), parsed.data.partnerId]
    );

    revalidatePath("/partners");
    return { ok: true };
}
