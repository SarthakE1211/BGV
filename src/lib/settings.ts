// src/lib/settings.ts
//
// Single source of truth for app-level toggles (M365 integrations, vendor
// enables, notification rules). Missing rows fall back to SETTING_DEFAULTS
// so a fresh DB / missing key is always safe.
//
// Keys are stable strings — the Settings UI binds to these, and the email
// gateway reads notification.* keys to decide whether to skip a send.

import { query, execute } from "@/src/lib/db";

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
export async function getAllSettings(): Promise<Record<SettingKey, boolean>> {
    const rows = await query<{ key: string; value: string }>(
        `SELECT \`key\`, \`value\` FROM app_settings`
    );
    const stored = new Map(rows.map((r) => [r.key, r.value === "1"]));
    const out = { ...SETTING_DEFAULTS } as Record<SettingKey, boolean>;
    for (const k of SETTING_KEYS) {
        if (stored.has(k)) out[k] = stored.get(k)!;
    }
    return out;
}

/** Read a single setting, falling back to its default. */
export async function getSetting(key: SettingKey): Promise<boolean> {
    const rows = await query<{ value: string }>(
        "SELECT `value` FROM app_settings WHERE `key` = ? LIMIT 1",
        [key]
    );
    if (rows.length === 0) return SETTING_DEFAULTS[key];
    return rows[0].value === "1";
}

/** Upsert one setting. Callers are expected to pass a validated key. */
export async function setSetting(
    key: SettingKey,
    value: boolean,
    updatedById: string | null
): Promise<void> {
    await execute(
        `INSERT INTO app_settings (\`key\`, \`value\`, updated_by_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`),
                                 updated_by_id = VALUES(updated_by_id)`,
        [key, value ? "1" : "0", updatedById]
    );
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
