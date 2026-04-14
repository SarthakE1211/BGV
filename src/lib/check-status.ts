// src/lib/check-status.ts
//
// Pure helper that derives the *aggregate* request status from its
// individual check statuses. Mirrors the rule from the integration guide:
//
//   all CLEARED              → GREEN
//   any FAILED               → RED_FLAG
//   some CLEARED (rest open) → AMBER
//   nothing done yet         → IN_PROGRESS
//
// `BLACKLISTED` is sticky — never recompute over it (handled by the
// caller skipping the update when the request is already BLACKLISTED).

import type { CheckStatus, BGVStatus } from "@/src/lib/enums";

export function recalcStatus(checks: Array<{ status: CheckStatus }>): BGVStatus {
    if (checks.length === 0) return "PENDING";
    const allCleared = checks.every((c) => c.status === "CLEARED");
    if (allCleared) return "GREEN";
    if (checks.some((c) => c.status === "FAILED")) return "RED_FLAG";
    if (checks.some((c) => c.status === "CLEARED")) return "AMBER";
    return "IN_PROGRESS";
}
