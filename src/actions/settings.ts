"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/src/lib/auth.helpers";
import { api, ApiError } from "@/src/lib/api-client";
import { SETTING_KEYS, type SettingKey } from "@/src/lib/settings";

export type ToggleSettingResult =
    | { ok: true; key: SettingKey; value: boolean }
    | { ok: false; error: string };

/** HR_HEAD-only. Persists a single toggle via Django API and
 *  refreshes the /settings page on success. */
export async function toggleSetting(
    key: string,
    value: boolean
): Promise<ToggleSettingResult> {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        return { ok: false, error: "Only HR Head can change system settings" };
    }
    if (!(SETTING_KEYS as readonly string[]).includes(key)) {
        return { ok: false, error: `Unknown setting key "${key}"` };
    }

    try {
        await api("/settings/toggle/", {
            method: "POST",
            userId: user.id,
            body: { key, value },
        });
        revalidatePath("/settings");
        return { ok: true, key: key as SettingKey, value };
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
