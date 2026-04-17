// src/lib/employees.ts
//
// Request-level "Employee BGV Database" view. One row per BGV request,
// with the status of each canonical check category aggregated per row
// so the table can render the mini per-check badges from the prototype.

import { query, queryOne } from "@/src/lib/db";
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

// Role-based scope — identical to the Requests page.
//   SDM        → only requests they submitted
//   SPECIALIST → only requests assigned to them
//   HR_HEAD    → all
function roleScope(role: UserRole, userId: string) {
    if (role === "SDM") {
        return { sql: "AND r.submitted_by_id = ?", params: [userId] };
    }
    if (role === "SPECIALIST") {
        return { sql: "AND r.assigned_specialist_id = ?", params: [userId] };
    }
    return { sql: "", params: [] as string[] };
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

// Rank statuses by severity so multiple checks of the same category
// collapse into the "most important" status for the mini-badge.
function severity(s: CheckStatus): number {
    switch (s) {
        case "FAILED":
            return 4;
        case "PENDING":
            return 3;
        case "IN_PROGRESS":
            return 2;
        case "CLEARED":
            return 1;
    }
}

function buildWhere(f: EmployeeFilters): { sql: string; params: unknown[] } {
    const conds: string[] = [];
    const params: unknown[] = [];

    if (f.q && f.q.trim().length >= 2) {
        const like = `%${f.q.trim()}%`;
        conds.push(
            "(c.name LIKE ? OR c.email LIKE ? OR p.code LIKE ? OR p.name LIKE ? OR pc.client_name LIKE ? OR r.request_number LIKE ?)"
        );
        params.push(like, like, like, like, like, like);
    }

    switch (f.tab) {
        case "green":
            conds.push("r.status = 'GREEN'");
            break;
        case "amber":
            conds.push("r.status IN ('AMBER','IN_PROGRESS','PENDING')");
            break;
        case "red":
            conds.push("r.status = 'RED_FLAG'");
            break;
        case "blacklisted":
            conds.push("r.status = 'BLACKLISTED'");
            break;
        default:
            break;
    }

    return {
        sql: conds.length ? "WHERE " + conds.join(" AND ") : "",
        params,
    };
}

interface RawRow {
    id: string;
    request_number: string;
    candidate_id: string;
    candidate_name: string;
    candidate_email: string;
    partner_code: string;
    partner_name: string;
    client_name: string | null;
    role_type: RoleType;
    region: Region;
    status: BGVStatus;
    letter_issued_date: Date | null;
    has_letter_docx: 0 | 1;
    approved_by_name: string | null;
    is_blacklisted: 0 | 1;
}

interface CheckRow {
    bgv_request_id: string;
    check_type: string;
    status: CheckStatus;
}

export async function listEmployees(
    filters: EmployeeFilters,
    page: number,
    role: UserRole,
    userId: string
): Promise<{ rows: EmployeeRow[]; total: number; page: number }> {
    const where = buildWhere(filters);
    const scope = roleScope(role, userId);
    const safePage = Math.max(1, Math.floor(page));
    const offset = (safePage - 1) * PAGE_SIZE;

    const base = `
        FROM bgv_requests r
        JOIN candidates c      ON c.id = r.candidate_id
        JOIN partners p        ON p.id = r.partner_id
        LEFT JOIN partner_clients pc ON pc.id = r.partner_client_id
        LEFT JOIN users approver     ON approver.id = r.approved_by_id
        WHERE r.status != 'PENDING'
        ${scope.sql}
        ${where.sql ? "AND " + where.sql.replace(/^WHERE\s+/i, "") : ""}
    `;

    // Scope params come BEFORE filter params because the scope clause is
    // interpolated inside `base` before the where.sql suffix.
    const allParams = [...scope.params, ...where.params];

    const [countRow, rawRows] = await Promise.all([
        queryOne<{ n: number }>(`SELECT COUNT(*) AS n ${base}`, allParams),
        query<RawRow>(
            `SELECT
                r.id,
                r.request_number,
                c.id    AS candidate_id,
                c.name  AS candidate_name,
                c.email AS candidate_email,
                p.code  AS partner_code,
                p.name  AS partner_name,
                pc.client_name,
                r.role_type,
                r.region,
                r.status,
                r.letter_issued_date,
                (r.letter_docx IS NOT NULL) AS has_letter_docx,
                approver.name AS approved_by_name,
                c.is_blacklisted
             ${base}
             ORDER BY r.created_at DESC
             LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
            allParams
        ),
    ]);

    // Second query: fetch all checks for those requests and aggregate
    // into per-category worst status.
    const ids = rawRows.map((r) => r.id);
    const checksByReq = new Map<
        string,
        { checks: Record<CheckCategory, CheckStatus | null>; otherLabel: string | null }
    >();
    for (const id of ids) {
        checksByReq.set(id, {
            checks: {
                CRIMINAL: null,
                EDUCATION: null,
                EMPLOYMENT: null,
                DRUG: null,
                CREDIT: null,
                SSN: null,
                OTHER: null,
            },
            otherLabel: null,
        });
    }

    if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        const checkRows = await query<CheckRow>(
            `SELECT bgv_request_id, check_type, status
             FROM bgv_checks
             WHERE bgv_request_id IN (${placeholders})`,
            ids
        );

        for (const ch of checkRows) {
            const bucket = checksByReq.get(ch.bgv_request_id);
            if (!bucket) continue;
            const cat = categorize(ch.check_type);
            const prev = bucket.checks[cat];
            if (!prev || severity(ch.status) > severity(prev)) {
                bucket.checks[cat] = ch.status;
                if (cat === "OTHER") bucket.otherLabel = ch.check_type;
            }
        }
    }

    const rows: EmployeeRow[] = rawRows.map((r) => {
        const bucket = checksByReq.get(r.id)!;
        return {
            requestId: r.id,
            requestNumber: r.request_number,
            candidateId: r.candidate_id,
            candidateName: r.candidate_name,
            candidateEmail: r.candidate_email,
            partnerCode: r.partner_code,
            partnerName: r.partner_name,
            clientName: r.client_name,
            roleType: r.role_type,
            region: r.region,
            status: r.status,
            letterIssuedDate: r.letter_issued_date,
            hasLetterDocx: Boolean(r.has_letter_docx),
            approvedByName: r.approved_by_name,
            isBlacklisted: Boolean(r.is_blacklisted),
            checksByCategory: bucket.checks,
            otherLabel: bucket.otherLabel,
        };
    });

    return {
        rows,
        total: Number(countRow?.n ?? 0),
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
    const scope = roleScope(role, userId);
    const row = await queryOne<{
        all: number;
        green: number;
        amber: number;
        red: number;
        blacklisted: number;
    }>(
        `SELECT
            COUNT(*) AS \`all\`,
            COALESCE(SUM(r.status = 'GREEN'), 0)                                    AS green,
            COALESCE(SUM(r.status IN ('AMBER','IN_PROGRESS','PENDING')), 0)         AS amber,
            COALESCE(SUM(r.status = 'RED_FLAG'), 0)                                 AS red,
            COALESCE(SUM(r.status = 'BLACKLISTED'), 0)                               AS blacklisted
         FROM bgv_requests r
         JOIN candidates c ON c.id = r.candidate_id
         WHERE r.status != 'PENDING'
         ${scope.sql}`,
        scope.params
    );
    return {
        all: Number(row?.all ?? 0),
        green: Number(row?.green ?? 0),
        amber: Number(row?.amber ?? 0),
        red: Number(row?.red ?? 0),
        blacklisted: Number(row?.blacklisted ?? 0),
    };
}
