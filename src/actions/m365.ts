"use server";

import { requireAuth } from "@/src/lib/auth.helpers";
import { api, ApiError } from "@/src/lib/api-client";
import { toActionResult, type ErrorCode } from "@/src/lib/errors";
import { UserRole } from "@/src/lib/enums";

export interface SyncResult {
    total?: number;
    created: number;
    updated: number;
    deactivated?: number;
    skipped?: number;
    durationMs?: number;
    errors?: string[];
}

export type SyncM365Result =
    | { ok: true; result: SyncResult }
    | { ok: false; error: string; code?: ErrorCode };

export async function syncM365Users(): Promise<SyncM365Result> {
    const user = await requireAuth(UserRole.HR_HEAD);
    try {
        // Try the dedicated M365 sync endpoint first, then fall back to /users/sync/
        let result: SyncResult;
        try {
            result = await api<SyncResult>("/m365/sync-users/", {
                method: "POST",
                userId: user.id,
            });
        } catch (e) {
            if (e instanceof ApiError && e.status === 404) {
                result = await api<SyncResult>("/users/sync/", {
                    method: "POST",
                    userId: user.id,
                });
            } else {
                throw e;
            }
        }
        return { ok: true, result };
    } catch (e) {
        return toActionResult(e);
    }
}
