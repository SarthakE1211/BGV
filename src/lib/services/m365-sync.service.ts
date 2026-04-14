// Pull enabled users from Azure AD via Microsoft Graph and upsert them
// into the local `users` table.
//
// Design:
//   - Match by azure_ad_id (the AAD object id). This is stable across
//     email / name changes in AD.
//   - New users default to SDM. Existing users keep whatever role HR
//     assigned — we never downgrade.
//   - No deactivation in v1. If Graph returns a partial list (throttling,
//     filter misconfig) we don't want to flip live users to inactive.
//     A separate reconcile job can do that later with proper safeguards.

import { execute, queryOne } from "@/src/lib/db";
import { cuid } from "@/src/lib/ids";
import { logger } from "@/src/lib/logger";
import { AppError } from "@/src/lib/errors";
import { listAllUsers, type GraphUser } from "@/src/lib/graph";
import { UserRole } from "@/src/lib/enums";
import type { AuthedUser } from "@/src/lib/auth.helpers";

export interface SyncResult {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    durationMs: number;
}

function pickEmail(u: GraphUser): string | null {
    const raw = (u.mail ?? u.userPrincipalName ?? "").trim();
    return raw || null;
}

function pickName(u: GraphUser): string {
    return (u.displayName ?? "").trim() || pickEmail(u) || u.id;
}

export async function syncUsersFromM365(actor: AuthedUser): Promise<SyncResult> {
    if (actor.role !== "HR_HEAD") {
        throw new AppError("FORBIDDEN", "Only HR Head can run M365 sync");
    }

    const started = Date.now();
    const users = await listAllUsers();
    logger.info("m365.sync fetched", { count: users.length, actor: actor.id });

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const u of users) {
        const email = pickEmail(u);
        if (!u.id || !email) {
            skipped++;
            continue;
        }
        const name = pickName(u);

        try {
            const existing = await queryOne<{ id: string }>(
                `SELECT id FROM users WHERE azure_ad_id = ? LIMIT 1`,
                [u.id]
            );

            if (existing) {
                // Preserve role + is_active. Only keep profile fields fresh.
                await execute(
                    `UPDATE users SET name = ?, email = ? WHERE id = ?`,
                    [name, email, existing.id]
                );
                updated++;
            } else {
                // New user — default to SDM. HR can promote in the Users UI.
                await execute(
                    `INSERT INTO users (id, name, email, role, azure_ad_id, is_active)
                     VALUES (?, ?, ?, ?, ?, 1)`,
                    [cuid(), name, email, UserRole.SDM, u.id]
                );
                created++;
            }
        } catch (err) {
            // Unique-key collision on email (same email, different azure_ad_id)
            // or any other per-row issue — log, count as skipped, continue.
            logger.warn("m365.sync row failed", {
                err,
                azureAdId: u.id,
                email,
            });
            skipped++;
        }
    }

    const durationMs = Date.now() - started;
    const result: SyncResult = {
        total: users.length,
        created,
        updated,
        skipped,
        durationMs,
    };
    logger.info("m365.sync complete", { ...result, actor: actor.id });
    return result;
}
