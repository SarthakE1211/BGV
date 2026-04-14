// src/lib/blacklist-registry.ts
//
// Read-only listing for the Blacklist Registry page.

import { query, queryOne } from "@/src/lib/db";

export const PAGE_SIZE = 50;

export interface BlacklistRow {
    id: string;
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string | null;
    partnerCode: string | null;
    partnerName: string | null;
    clientName: string | null;
    failedCheck: string;
    reason: string;
    blacklistedBy: string;
    bgvRequestNumber: string;
    bgvRequestId: string;
    createdAt: Date;
}

export async function listBlacklist(
    q: string | null,
    page: number
): Promise<{ rows: BlacklistRow[]; total: number; page: number }> {
    const safePage = Math.max(1, Math.floor(page));
    const offset = (safePage - 1) * PAGE_SIZE;

    const conds: string[] = [];
    const params: unknown[] = [];
    if (q && q.trim()) {
        const like = `%${q.trim()}%`;
        conds.push("(c.name LIKE ? OR c.email LIKE ? OR b.reason LIKE ?)");
        params.push(like, like, like);
    }
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

    const base = `
        FROM blacklist_entries b
        JOIN candidates   c  ON c.id = b.candidate_id
        JOIN bgv_requests r  ON r.id = b.bgv_request_id
        JOIN users        u  ON u.id = b.blacklisted_by_id
        LEFT JOIN partners p ON p.id = r.partner_id
        LEFT JOIN partner_clients pc ON pc.id = r.partner_client_id
        ${where}
    `;

    const [countRow, rows] = await Promise.all([
        queryOne<{ n: number }>(`SELECT COUNT(*) AS n ${base}`, params),
        query<{
            id: string;
            candidate_name: string;
            candidate_email: string;
            candidate_phone: string | null;
            partner_code: string | null;
            partner_name: string | null;
            client_name: string | null;
            failed_check: string;
            reason: string;
            blacklisted_by: string;
            request_number: string;
            request_id: string;
            created_at: Date;
        }>(
            `SELECT
                b.id,
                c.name  AS candidate_name,
                c.email AS candidate_email,
                c.phone AS candidate_phone,
                p.code  AS partner_code,
                p.name  AS partner_name,
                pc.client_name,
                b.failed_check,
                b.reason,
                u.name  AS blacklisted_by,
                r.request_number,
                r.id    AS request_id,
                b.created_at
             ${base}
             ORDER BY b.created_at DESC
             LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
            params
        ),
    ]);

    return {
        rows: rows.map((r) => ({
            id: r.id,
            candidateName: r.candidate_name,
            candidateEmail: r.candidate_email,
            candidatePhone: r.candidate_phone,
            partnerCode: r.partner_code,
            partnerName: r.partner_name,
            clientName: r.client_name,
            failedCheck: r.failed_check,
            reason: r.reason,
            blacklistedBy: r.blacklisted_by,
            bgvRequestNumber: r.request_number,
            bgvRequestId: r.request_id,
            createdAt: r.created_at,
        })),
        total: Number(countRow?.n ?? 0),
        page: safePage,
    };
}
