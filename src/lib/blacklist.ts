// src/lib/blacklist.ts
//
// Pre-submit blacklist gate. Run BEFORE creating any rows.
//   - Exact match on candidates.email  (any matching candidate flagged blacklisted)
//   - Soft match on candidates.name   (LIKE — MySQL doesn't ship pg_trgm)
//
// Returns the first match found, or null. The server action throws when
// non-null so the form can show a red info box and abort.

import { queryOne } from "@/src/lib/db";

export interface BlacklistMatch {
    matchType: "EMAIL" | "NAME";
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    failedCheck: string;
    reason: string;
}

export async function findBlacklistMatch(
    name: string,
    email: string
): Promise<BlacklistMatch | null> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (cleanEmail) {
        const byEmail = await queryOne<{
            id: string;
            name: string;
            email: string;
            failed_check: string;
            reason: string;
        }>(
            `SELECT c.id, c.name, c.email, b.failed_check, b.reason
             FROM candidates c
             JOIN blacklist_entries b ON b.candidate_id = c.id
             WHERE LOWER(c.email) = ?
             ORDER BY b.created_at DESC
             LIMIT 1`,
            [cleanEmail]
        );
        if (byEmail) {
            return {
                matchType: "EMAIL",
                candidateId: byEmail.id,
                candidateName: byEmail.name,
                candidateEmail: byEmail.email,
                failedCheck: byEmail.failed_check,
                reason: byEmail.reason,
            };
        }
    }

    if (cleanName.length >= 3) {
        const byName = await queryOne<{
            id: string;
            name: string;
            email: string;
            failed_check: string;
            reason: string;
        }>(
            `SELECT c.id, c.name, c.email, b.failed_check, b.reason
             FROM candidates c
             JOIN blacklist_entries b ON b.candidate_id = c.id
             WHERE c.name LIKE ?
             ORDER BY b.created_at DESC
             LIMIT 1`,
            [`%${cleanName}%`]
        );
        if (byName) {
            return {
                matchType: "NAME",
                candidateId: byName.id,
                candidateName: byName.name,
                candidateEmail: byName.email,
                failedCheck: byName.failed_check,
                reason: byName.reason,
            };
        }
    }

    return null;
}
