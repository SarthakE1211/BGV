// src/lib/employees.ts
//
// Request-level "Employee BGV Database" view.
// Calls Django REST API instead of direct MySQL queries.

import { api, type PaginatedResponse } from "@/src/lib/api-client";
import type {
    BGVStatus,
    CheckStatus,
    RoleType,
    Region,
    UserRole,
} from "@/src/lib/enums";

export const PAGE_SIZE = 50;

export type CheckCategory =
    | "CRIMINAL"
    | "EDUCATION"
    | "EMPLOYMENT"
    | "DRUG"
    | "CREDIT"
    | "SSN"
    | "OTHER";

export const CHECK_CATEGORIES: CheckCategory[] = [
    "CRIMINAL",
    "EDUCATION",
    "EMPLOYMENT",
    "DRUG",
    "CREDIT",
    "SSN",
    "OTHER",
];

export const CATEGORY_LABEL: Record<CheckCategory, string> = {
    CRIMINAL: "Criminal",
    EDUCATION: "Education",
    EMPLOYMENT: "Employment",
    DRUG: "Drug Test",
    CREDIT: "Credit",
    SSN: "SSN/Addr",
    OTHER: "Other",
};

export interface EmployeeRow {
    requestId: string;
    requestNumber: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    partnerCode: string;
    partnerName: string;
    clientName: string | null;
    roleType: RoleType;
    region: Region;
    status: BGVStatus;
    letterIssuedDate: Date | null;
    hasLetterDocx: boolean;
    approvedByName: string | null;
    isBlacklisted: boolean;
    /** Per-category "worst" status. FAILED > PENDING/IN_PROGRESS > CLEARED > null. */
    checksByCategory: Record<CheckCategory, CheckStatus | null>;
    /** A single check type label to show inside the "Other" cell, if any. */
    otherLabel: string | null;
}

export type EmployeeTab = "all" | "green" | "amber" | "red" | "blacklisted";

export interface EmployeeFilters {
    q?: string | null;
    tab?: EmployeeTab;
}

// Categorize a check type string into one of the canonical buckets.
export function categorize(checkType: string): CheckCategory {
    const u = checkType.toUpperCase();
    if (u.includes("CRIMINAL")) return "CRIMINAL";
    if (u.includes("EDUCATION")) return "EDUCATION";
    if (u.includes("EMPLOYMENT")) return "EMPLOYMENT";
    if (u.includes("DRUG")) return "DRUG";
    if (u.includes("CREDIT") || u.includes("BANKRUPT")) return "CREDIT";
    if (u.includes("SSN") || u.includes("ADDRESS")) return "SSN";
    return "OTHER";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ApiEmployeeRow {
    [key: string]: any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function emptyChecks(): Record<CheckCategory, CheckStatus | null> {
    return {
        CRIMINAL: null,
        EDUCATION: null,
        EMPLOYMENT: null,
        DRUG: null,
        CREDIT: null,
        SSN: null,
        OTHER: null,
    };
}

function mapEmployeeRow(r: ApiEmployeeRow): EmployeeRow {
    // The Django API returns the check status breakdown already aggregated
    // per employee row (checks_by_category or checksByCategory).
    const rawChecks =
        r.checks_by_category ?? r.checksByCategory ?? {};
    const checks = emptyChecks();
    for (const cat of CHECK_CATEGORIES) {
        if (rawChecks[cat] !== undefined && rawChecks[cat] !== null) {
            checks[cat] = rawChecks[cat] as CheckStatus;
        }
    }

    return {
        requestId: r.request_id ?? r.requestId ?? r.id ?? "",
        requestNumber: r.request_number ?? r.requestNumber ?? "",
        candidateId: r.candidate_id ?? r.candidateId ?? "",
        candidateName: r.candidate_name ?? r.candidateName ?? "",
        candidateEmail: r.candidate_email ?? r.candidateEmail ?? "",
        partnerCode: r.partner_code ?? r.partnerCode ?? "",
        partnerName: r.partner_name ?? r.partnerName ?? "",
        clientName: r.client_name ?? r.clientName ?? null,
        roleType: r.role_type ?? r.roleType ?? "FTE_W2",
        region: r.region ?? "USA",
        status: r.status ?? "PENDING",
        letterIssuedDate: (r.letter_issued_date ?? r.letterIssuedDate)
            ? new Date(r.letter_issued_date ?? r.letterIssuedDate)
            : null,
        hasLetterDocx: Boolean(
            r.has_letter_docx ?? r.hasLetterDocx ?? false
        ),
        approvedByName: r.approved_by_name ?? r.approvedByName ?? null,
        isBlacklisted: Boolean(
            r.is_blacklisted ?? r.isBlacklisted ?? false
        ),
        checksByCategory: checks,
        otherLabel: r.other_label ?? r.otherLabel ?? null,
    };
}

export async function listEmployees(
    filters: EmployeeFilters,
    page: number,
    role: UserRole,
    userId: string
): Promise<{ rows: EmployeeRow[]; total: number; page: number }> {
    const safePage = Math.max(1, Math.floor(page));

    const data = await api<PaginatedResponse<ApiEmployeeRow>>(
        "/employees/",
        {
            userId,
            params: {
                page: safePage,
                page_size: PAGE_SIZE,
                tab: filters.tab || null,
                q: filters.q || null,
            },
        }
    );

    return {
        rows: data.results.map(mapEmployeeRow),
        total: data.count,
        page: safePage,
    };
}

export interface EmployeeTabCounts {
    all: number;
    green: number;
    amber: number;
    red: number;
    blacklisted: number;
}

export async function getEmployeeTabCounts(
    role: UserRole,
    userId: string
): Promise<EmployeeTabCounts> {
    const data = await api<EmployeeTabCounts>(
        "/employees/tab-counts/",
        { userId }
    );

    return {
        all: Number(data.all ?? 0),
        green: Number(data.green ?? 0),
        amber: Number(data.amber ?? 0),
        red: Number(data.red ?? 0),
        blacklisted: Number(data.blacklisted ?? 0),
    };
}
