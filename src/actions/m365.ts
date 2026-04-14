"use server";

import { requireAuth } from "@/src/lib/auth.helpers";
import { syncUsersFromM365, type SyncResult } from "@/src/lib/services/m365-sync.service";
import { toActionResult, type ErrorCode } from "@/src/lib/errors";
import { UserRole } from "@/src/lib/enums";

export type SyncM365Result =
    | { ok: true; result: SyncResult }
    | { ok: false; error: string; code?: ErrorCode };

export async function syncM365Users(): Promise<SyncM365Result> {
    const user = await requireAuth(UserRole.HR_HEAD);
    try {
        const result = await syncUsersFromM365(user);
        return { ok: true, result };
    } catch (e) {
        return toActionResult(e);
    }
}
