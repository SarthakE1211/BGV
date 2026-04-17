"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/src/lib/auth.helpers";
import { setSetting, SETTING_KEYS, type SettingKey } from "@/src/lib/settings";

export type ToggleSettingResult =
    | { ok: true; key: SettingKey; value: boolean }
    | { ok: false; error: string };

/** HR_HEAD-only. Persists a single toggle to the `app_settings` table and
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
    await setSetting(key as SettingKey, value, user.id);
    revalidatePath("/settings");
    return { ok: true, key: key as SettingKey, value };
}
