// src/lib/dashboard.ts
//
// Data-access layer for the dashboard screen.
// Calls Django REST API instead of direct MySQL queries.

import { api, type PaginatedResponse } from "@/src/lib/api-client";
import type { UserRole, BGVStatus, RoleType, Region, BGVVendor } from "@/src/lib/enums";

export interface DashboardStats {
    active: number;           // IN_PROGRESS, AMBER, PENDING
    pendingChecks: number;    // individual checks in PENDING/IN_PROGRESS
    overdueChecks: number;    // pending/in-progress checks older than 5 days
    completed: number;        // GREEN this month
    redFlags: number;         // RED_FLAG requests
    blacklisted: number;      // all-time blacklisted candidates
    lettersIssued: number;    // letter_issued_date this month
}

export interface ActiveRequestRow {
    id: string;
    requestNumber: string;
    status: BGVStatus;
    roleType: RoleType;
    region: Region;
    bgvVendor: BGVVendor;
    createdAt: Date;
    initiationDate: Date | null;
    candidate: { name: string; email: string };
    partner: { name: string; code: string };
    clientName: string | null;
    checksCleared: number;
    checksTotal: number;
}

export interface PartnerBreakdownRow {
    code: string;
    name: string;
    total: number;
    fte: number;
    pro: number;
    dispatch: number;
    backfill: number;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export async function getDashboardStats(
    role: UserRole,
    userId: string
): Promise<DashboardStats> {
    // Django returns a flat object — no `stats` wrapper.
    const s = await api<{
        active?: number;
        pending_checks?: number;
        pendingChecks?: number;
        overdue_checks?: number;
        overdueChecks?: number;
        completed?: number;
        red_flags?: number;
        redFlags?: number;
        blacklisted?: number;
        letters_issued?: number;
        lettersIssued?: number;
    }>("/reports/dashboard/", { userId });

    return {
        active: Number(s.active ?? 0),
        pendingChecks: Number(s.pending_checks ?? s.pendingChecks ?? 0),
        overdueChecks: Number(s.overdue_checks ?? s.overdueChecks ?? 0),
        completed: Number(s.completed ?? 0),
        redFlags: Number(s.red_flags ?? s.redFlags ?? 0),
        blacklisted: Number(s.blacklisted ?? 0),
        lettersIssued: Number(s.letters_issued ?? s.lettersIssued ?? 0),
    };
}

// ─── Active requests (table rows) ────────────────────────────────────────────
interface ApiActiveRow {
    id: string;
    request_number?: string;
    requestNumber?: string;
    status: BGVStatus;
    role_type?: RoleType;
    roleType?: RoleType;
    region: Region;
    bgv_vendor?: BGVVendor;
    bgvVendor?: BGVVendor;
    created_at?: string;
    createdAt?: string;
    initiation_date?: string | null;
    initiationDate?: string | null;
    candidate_name?: string;
    candidate_email?: string;
    candidate?: { name: string; email: string };
    partner_name?: string;
    partner_code?: string;
    partner?: { name: string; code: string };
    client_name?: string | null;
    clientName?: string | null;
    checks_total?: number;
    checksTotal?: number;
    checks_cleared?: number;
    checksCleared?: number;
}

export async function getActiveRequests(
    role: UserRole,
    userId: string,
    limit = 20
): Promise<ActiveRequestRow[]> {
    // Django returns a paginated list from the requests endpoint.
    // Filter by non-complete statuses to get "active" requests.
    const data = await api<PaginatedResponse<ApiActiveRow>>(
        "/bgv/requests/",
        {
            userId,
            params: {
                page_size: limit,
                tab: "all",
            },
        }
    );

    return (data.results ?? []).map((r) => ({
        id: r.id,
        requestNumber: r.request_number ?? r.requestNumber ?? "",
        status: r.status,
        roleType: r.role_type ?? r.roleType ?? ("FTE_W2" as RoleType),
        region: r.region,
        bgvVendor: r.bgv_vendor ?? r.bgvVendor ?? ("DISA" as BGVVendor),
        createdAt: new Date(r.created_at ?? r.createdAt ?? ""),
        initiationDate: (r.initiation_date ?? r.initiationDate)
            ? new Date((r.initiation_date ?? r.initiationDate)!)
            : null,
        candidate: r.candidate ?? {
            name: r.candidate_name ?? "",
            email: r.candidate_email ?? "",
        },
        partner: r.partner ?? {
            name: r.partner_name ?? "",
            code: r.partner_code ?? "",
        },
        clientName: r.client_name ?? r.clientName ?? null,
        checksCleared: Number(r.checks_cleared ?? r.checksCleared ?? 0),
        checksTotal: Number(r.checks_total ?? r.checksTotal ?? 0),
    }));
}

// ─── Partner breakdown (mini cards on dashboard) ─────────────────────────────
export async function getPartnerBreakdown(
    role: UserRole,
    userId: string
): Promise<PartnerBreakdownRow[]> {
    // Django returns a flat array from /reports/partner-progress/.
    const rows = await api<Array<{
        code: string;
        name: string;
        active?: number;
        total?: number;
        fte?: number;
        pro?: number;
        dispatch?: number;
        backfill?: number;
    }>>("/reports/partner-progress/", { userId });

    return rows.map((r) => ({
        code: r.code,
        name: r.name,
        total: Number(r.active ?? r.total ?? 0),
        fte: Number(r.fte ?? 0),
        pro: Number(r.pro ?? 0),
        dispatch: Number(r.dispatch ?? 0),
        backfill: Number(r.backfill ?? 0),
    }));
}
