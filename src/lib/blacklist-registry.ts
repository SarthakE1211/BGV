// src/lib/blacklist-registry.ts
// Calls Django REST API for blacklist data.

import { api, type PaginatedResponse } from "@/src/lib/api-client";

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

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(r: any): BlacklistRow {
    const candidate = r.candidate ?? {};
    const req = r.bgv_request ?? r.bgvRequest ?? {};
    return {
        id: r.id,
        candidateName: candidate.name ?? r.candidate_name ?? r.candidateName ?? "",
        candidateEmail: candidate.email ?? r.candidate_email ?? r.candidateEmail ?? "",
        candidatePhone: candidate.phone ?? r.candidate_phone ?? null,
        partnerCode: req.partner?.code ?? r.partner_code ?? r.partnerCode ?? null,
        partnerName: req.partner?.name ?? r.partner_name ?? r.partnerName ?? null,
        clientName: r.client_name ?? r.clientName ?? null,
        failedCheck: r.failed_check ?? r.failedCheck ?? "",
        reason: r.reason ?? "",
        blacklistedBy: r.blacklisted_by?.name ?? r.blacklisted_by_name ?? r.blacklistedBy ?? "",
        bgvRequestNumber: req.request_number ?? r.request_number ?? r.bgvRequestNumber ?? "",
        bgvRequestId: req.id ?? r.bgv_request_id ?? r.bgvRequestId ?? "",
        createdAt: new Date(r.created_at ?? r.createdAt ?? ""),
    };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listBlacklist(
    q: string | null,
    page: number,
    userId?: string
): Promise<{ rows: BlacklistRow[]; total: number; page: number }> {
    const safePage = Math.max(1, Math.floor(page));

    const data = await api<PaginatedResponse<unknown>>(
        "/bgv/blacklist/",
        {
            userId,
            params: {
                page: safePage,
                page_size: PAGE_SIZE,
                search: q || null,
            },
        }
    );

    return {
        rows: data.results.map(mapRow),
        total: data.count,
        page: safePage,
    };
}
