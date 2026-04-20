// src/lib/settings.ts
//
// Single source of truth for app-level toggles (M365 integrations, vendor
// enables, notification rules). Calls Django REST API instead of direct SQL.
//
// SETTING_DEFAULTS and settingKeyForTrigger are kept locally since they're
// used by other modules without needing a network call.

import { api } from "@/src/lib/api-client";

export const SETTING_DEFAULTS = {
    // Microsoft 365 Integration
    "m365.sso_login": true,
    "m365.outlook_email": true,
    "m365.sharepoint_storage": true,

    // BGV Vendor Configuration
    "vendor.disa": true,
    "vendor.precisehire": true,

    // Email Notification Rules — read by sendEmail() to gate dispatch
    "notify.check_cleared": true,
    "notify.all_checks_green": true,
    "notify.check_failed": true,
    "notify.blacklist": true,
    "notify.daily_report": true,
    "notify.overdue": true,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS) as SettingKey[];

/** Load all settings as a `{ key: boolean }` map, with defaults applied for
 *  any key not yet persisted. */
export async function getAllSettings(
    userId?: string
): Promise<Record<SettingKey, boolean>> {
    interface SettingRow {
        key: string;
        value: string | boolean;
        is_on?: boolean;
    }

    const rows = await api<SettingRow[]>("/settings/", { userId });
    const stored = new Map<string, boolean>();
    for (const r of rows) {
        const val =
            typeof r.value === "boolean"
                ? r.value
                : typeof r.is_on === "boolean"
                  ? r.is_on
                  : r.value === "1" || r.value === "true";
        stored.set(r.key, val);
    }

    const out = { ...SETTING_DEFAULTS } as Record<SettingKey, boolean>;
    for (const k of SETTING_KEYS) {
        if (stored.has(k)) out[k] = stored.get(k)!;
    }
    return out;
}

/** Read a single setting, falling back to its default. */
export async function getSetting(
    key: SettingKey,
    userId?: string
): Promise<boolean> {
    const all = await getAllSettings(userId);
    return all[key];
}

/** Upsert one setting. Calls the Django toggle endpoint. */
export async function setSetting(
    key: SettingKey,
    value: boolean,
    updatedById: string | null
): Promise<void> {
    await api("/settings/toggle/", {
        method: "POST",
        body: { key, value },
        userId: updatedById ?? undefined,
    });
}

/** Map each email trigger to the setting key that gates it. Returns null for
 *  triggers that aren't user-toggleable (e.g. REQUEST_SUBMITTED, manual
 *  SDM_UPDATE, candidate-facing emails — those always fire). */
const TRIGGER_TO_KEY: Record<string, SettingKey | null> = {
    CHECK_CLEARED: "notify.check_cleared",
    ALL_CHECKS_GREEN: "notify.all_checks_green",
    CHECK_FAILED: "notify.check_failed",
    CANDIDATE_BLACKLISTED: "notify.blacklist",
    DAILY_REPORT: "notify.daily_report",
    // Always-on:
    REQUEST_SUBMITTED: null,
    REQUEST_APPROVED: null,
    SDM_UPDATE: null,
    CANDIDATE_INITIATED: null,
    CANDIDATE_LETTER_ISSUED: null,
};

export function settingKeyForTrigger(trigger: string): SettingKey | null {
    return TRIGGER_TO_KEY[trigger] ?? null;
}
