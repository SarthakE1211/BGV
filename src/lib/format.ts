// src/lib/format.ts
//
// Shared date/time formatters. Use fmtDateTime() for any UI surface that
// shows a timestamp — it always includes seconds per product requirement.
// fmtDate() is kept for the clearance letter where only a calendar date is
// legally meaningful.
//
// Timezone: pinned to Asia/Kolkata (IST) so server-rendered timestamps match
// the user's local wall clock regardless of where the Node process runs
// (dev machine UTC, Azure App Service UTC, etc.). If you later deploy to a
// multi-timezone team, swap DISPLAY_TZ for a per-user preference.
const DISPLAY_TZ = "Asia/Kolkata";

/** Full timestamp with seconds — e.g. "Apr 16, 2026, 05:20:37 PM". */
export function fmtDateTime(d: Date | string | null | undefined): string {
    if (!d) return "—";
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: DISPLAY_TZ,
    });
}

/** Calendar date only — e.g. "April 16, 2026". Used in formal documents. */
export function fmtDate(d: Date | string | null | undefined): string {
    if (!d) return "—";
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: DISPLAY_TZ,
    });
}

/** Compact timestamp for dense tables — still includes seconds.
 *  E.g. "Apr 16, 05:20:37 PM". */
export function fmtDateTimeShort(d: Date | string | null | undefined): string {
    if (!d) return "—";
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: DISPLAY_TZ,
    });
}
