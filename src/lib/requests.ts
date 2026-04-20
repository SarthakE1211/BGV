// src/lib/requests.ts
//
// Data-access layer for the BGV Requests page.
// Calls Django REST API instead of direct MySQL queries.

import { api, type PaginatedResponse } from "@/src/lib/api-client";
import type {
    UserRole,
    BGVStatus,
    RoleType,
    Region,
    BGVVendor,
} from "@/src/lib/enums";

export const PAGE_SIZE = 25;

export type RequestsTab =
    | "all"
    | "pending"
    | "in-progress"
    | "awaiting-approval"
    | "complete";

export const TAB_LABELS: Record<RequestsTab, string> = {
    all: "All Requests",
    pending: "Pending Initiation",
    "in-progress": "In Progress",
    "awaiting-approval": "Awaiting Approval",
    complete: "Complete",
};

export interface ListFilters {
    tab?: RequestsTab;
    q?: string | null;
    partner?: string | null;   // partner code (HCL, COG…)
    region?: Region | null;
    roleType?: RoleType | null;
    sdm?: string | null;       // users.id of an SDM
}

export interface RequestListRow {
    id: string;
    requestNumber: string;
    status: BGVStatus;
    roleType: RoleType;
    region: Region;
    bgvVendor: BGVVendor;
    bgvType: string;
    createdAt: Date;
    initiationDate: Date | null;
    candidate: { name: string; email: string };
    partner: { name: string; code: string };
    clientName: string | null;
    submittedBy: string;
    checksCleared: number;
    checksTotal: number;
}

// ─── Django API response row shape ──────────────────────────────────────────
interface ApiRequestRow {
    id: string;
    request_number: string;
    status: BGVStatus;
    role_type: RoleType;
    region: Region;
    bgv_vendor: BGVVendor;
    bgv_type: string;
    created_at: string;
    initiation_date: string | null;
    candidate_name: string;
    candidate_email: string;
    partner_name: string;
    partner_code: string;
    client_name: string | null;
    submitted_by_name: string;
    checks_total: number;
    checks_cleared: number;
    // DRF may use camelCase — handle both
    requestNumber?: string;
    roleType?: RoleType;
    bgvVendor?: BGVVendor;
    bgvType?: string;
    createdAt?: string;
    initiationDate?: string | null;
    candidate?: { name: string; email: string };
    partner?: { name: string; code: string };
    clientName?: string | null;
    submittedBy?: string;
    checksCleared?: number;
    checksTotal?: number;
}

function mapRow(r: ApiRequestRow): RequestListRow {
    return {
        id: r.id,
        requestNumber: r.request_number ?? r.requestNumber ?? "",
        status: r.status,
        roleType: r.role_type ?? r.roleType ?? ("FTE_W2" as RoleType),
        region: r.region,
        bgvVendor: r.bgv_vendor ?? r.bgvVendor ?? ("DISA" as BGVVendor),
        bgvType: r.bgv_type ?? r.bgvType ?? "",
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
        submittedBy: r.submitted_by_name ?? r.submittedBy ?? "",
        checksCleared: Number(r.checks_cleared ?? r.checksCleared ?? 0),
        checksTotal: Number(r.checks_total ?? r.checksTotal ?? 0),
    };
}

// ─── List + total ────────────────────────────────────────────────────────────
export async function listRequests(
    role: UserRole,
    userId: string,
    filters: ListFilters,
    page: number
): Promise<{ rows: RequestListRow[]; total: number; page: number }> {
    const safePage = Math.max(1, Math.floor(page));

    const data = await api<PaginatedResponse<ApiRequestRow>>(
        "/bgv/requests/",
        {
            userId,
            params: {
                page: safePage,
                page_size: PAGE_SIZE,
                tab: filters.tab || null,
                q: filters.q || null,
                partner: filters.partner || null,
                region: filters.region || null,
                roleType: filters.roleType || null,
                sdm: filters.sdm || null,
            },
        }
    );

    return {
        rows: data.results.map(mapRow),
        total: data.count,
        page: safePage,
    };
}

// ─── Per-tab counts (drives the numbers next to each tab label) ──────────────
export interface TabCounts {
    all: number;
    pending: number;
    "in-progress": number;
    "awaiting-approval": number;
    complete: number;
}

export async function getTabCounts(
    role: UserRole,
    userId: string
): Promise<TabCounts> {
    const data = await api<{
        all: number;
        pending: number;
        in_progress: number;
        awaiting_approval: number;
        complete: number;
        // camelCase fallbacks
        "in-progress"?: number;
        "awaiting-approval"?: number;
    }>("/bgv/requests/tab_counts/", { userId });

    return {
        all: Number(data.all ?? 0),
        pending: Number(data.pending ?? 0),
        "in-progress": Number(data.in_progress ?? data["in-progress"] ?? 0),
        "awaiting-approval": Number(data.awaiting_approval ?? data["awaiting-approval"] ?? 0),
        complete: Number(data.complete ?? 0),
    };
}

// ─── Partner option type (used by RequestForm, NewRequestModal, etc.) ───────
export interface PartnerOption {
    id: string;
    code: string;
    name: string;
}

// ─── Filter-dropdown options ─────────────────────────────────────────────────
export async function getPartnerOptions(
    userId?: string
): Promise<Array<{ code: string; name: string }>> {
    return api<Array<{ code: string; name: string }>>("/partners/options/", { userId });
}

/** Partner options with ids — used by the new-request form. */
export async function getPartnerOptionsWithIds(
    userId?: string
): Promise<PartnerOption[]> {
    return api<PartnerOption[]>("/partners/options/", { userId });
}

export async function getSDMOptions(
    userId?: string
): Promise<Array<{ id: string; name: string }>> {
    return api<Array<{ id: string; name: string }>>("/users/sdms/", { userId });
}
