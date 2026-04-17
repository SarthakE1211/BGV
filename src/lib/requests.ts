// src/lib/requests.ts
//
// Data-access layer for the BGV Requests page.
// Used by both the server page (app/(protected)/requests/page.tsx)
// and the JSON endpoint (app/api/requests/route.ts).

import { query, queryOne } from "@/src/lib/db";
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

// ─── WHERE builder ───────────────────────────────────────────────────────────
interface BuiltWhere {
    sql: string;
    params: unknown[];
}

function buildWhere(
    role: UserRole,
    userId: string,
    f: ListFilters
): BuiltWhere {
    const conds: string[] = [];
    const params: unknown[] = [];

    // SDM scope — hard filter, user-provided sdm filter is ignored for SDMs
    if (role === "SDM") {
        conds.push("r.submitted_by_id = ?");
        params.push(userId);
    } else if (role === "SPECIALIST") {
        // Specialists only see requests assigned to them.
        conds.push("r.assigned_specialist_id = ?");
        params.push(userId);
    } else if (f.sdm) {
        conds.push("r.submitted_by_id = ?");
        params.push(f.sdm);
    }

    // Tab → status
    switch (f.tab) {
        case "pending":
            conds.push("r.status = 'PENDING'");
            break;
        case "in-progress":
            conds.push("r.status IN ('IN_PROGRESS','AMBER')");
            break;
        case "awaiting-approval":
            conds.push("r.status = 'GREEN' AND r.approved_by_id IS NULL");
            break;
        case "complete":
            conds.push("r.status = 'GREEN' AND r.approved_by_id IS NOT NULL");
            break;
        default:
            // all — no status constraint
            break;
    }

    if (f.partner) {
        conds.push("p.code = ?");
        params.push(f.partner);
    }
    if (f.region) {
        conds.push("r.region = ?");
        params.push(f.region);
    }
    if (f.roleType) {
        conds.push("r.role_type = ?");
        params.push(f.roleType);
    }
    if (f.q && f.q.trim()) {
        const like = `%${f.q.trim()}%`;
        conds.push("(c.name LIKE ? OR c.email LIKE ? OR r.request_number LIKE ?)");
        params.push(like, like, like);
    }

    const sql = conds.length ? "WHERE " + conds.join(" AND ") : "";
    return { sql, params };
}

// ─── List + total ────────────────────────────────────────────────────────────
interface RawRow {
    id: string;
    request_number: string;
    status: BGVStatus;
    role_type: RoleType;
    region: Region;
    bgv_vendor: BGVVendor;
    bgv_type: string;
    created_at: Date;
    initiation_date: Date | null;
    candidate_name: string;
    candidate_email: string;
    partner_name: string;
    partner_code: string;
    client_name: string | null;
    submitted_by_name: string;
    checks_total: number;
    checks_cleared: number;
}

export async function listRequests(
    role: UserRole,
    userId: string,
    filters: ListFilters,
    page: number
): Promise<{ rows: RequestListRow[]; total: number; page: number }> {
    const where = buildWhere(role, userId, filters);
    const safePage = Math.max(1, Math.floor(page));
    const offset = (safePage - 1) * PAGE_SIZE;

    // Base FROM+JOIN fragment — used in both SELECT and COUNT.
    const base = `
        FROM bgv_requests r
        JOIN candidates c      ON c.id = r.candidate_id
        JOIN partners   p      ON p.id = r.partner_id
        JOIN users      u      ON u.id = r.submitted_by_id
        LEFT JOIN partner_clients pc ON pc.id = r.partner_client_id
        ${where.sql}
    `;

    const [countRow, rows] = await Promise.all([
        queryOne<{ n: number }>(`SELECT COUNT(*) AS n ${base}`, where.params),
        query<RawRow>(
            `SELECT
                r.id,
                r.request_number,
                r.status,
                r.role_type,
                r.region,
                r.bgv_vendor,
                r.bgv_type,
                r.created_at,
                r.initiation_date,
                c.name  AS candidate_name,
                c.email AS candidate_email,
                p.name  AS partner_name,
                p.code  AS partner_code,
                COALESCE(r.client_account, pc.client_name) AS client_name,
                u.name  AS submitted_by_name,
                (SELECT COUNT(*) FROM bgv_checks WHERE bgv_request_id = r.id)                    AS checks_total,
                (SELECT COUNT(*) FROM bgv_checks WHERE bgv_request_id = r.id AND status='CLEARED') AS checks_cleared
             ${base}
             ORDER BY r.created_at DESC
             LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
            where.params
        ),
    ]);

    const mapped: RequestListRow[] = rows.map((r) => ({
        id: r.id,
        requestNumber: r.request_number,
        status: r.status,
        roleType: r.role_type,
        region: r.region,
        bgvVendor: r.bgv_vendor,
        bgvType: r.bgv_type,
        createdAt: r.created_at,
        initiationDate: r.initiation_date,
        candidate: { name: r.candidate_name, email: r.candidate_email },
        partner: { name: r.partner_name, code: r.partner_code },
        clientName: r.client_name,
        submittedBy: r.submitted_by_name,
        checksCleared: Number(r.checks_cleared),
        checksTotal: Number(r.checks_total),
    }));

    return { rows: mapped, total: Number(countRow?.n ?? 0), page: safePage };
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
    const scope =
        role === "SDM"
            ? { sql: "WHERE submitted_by_id = ?", params: [userId] as unknown[] }
            : role === "SPECIALIST"
              ? { sql: "WHERE assigned_specialist_id = ?", params: [userId] as unknown[] }
              : { sql: "", params: [] as unknown[] };

    const row = await queryOne<{
        all: number;
        pending: number;
        in_progress: number;
        awaiting_approval: number;
        complete: number;
    }>(
        `SELECT
            COUNT(*)                                                                     AS \`all\`,
            COALESCE(SUM(status='PENDING'), 0)                                            AS pending,
            COALESCE(SUM(status IN ('IN_PROGRESS','AMBER')), 0)                           AS in_progress,
            COALESCE(SUM(status='GREEN' AND approved_by_id IS NULL), 0)                   AS awaiting_approval,
            COALESCE(SUM(status='GREEN' AND approved_by_id IS NOT NULL), 0)               AS complete
         FROM bgv_requests
         ${scope.sql}`,
        scope.params
    );

    return {
        all: Number(row?.all ?? 0),
        pending: Number(row?.pending ?? 0),
        "in-progress": Number(row?.in_progress ?? 0),
        "awaiting-approval": Number(row?.awaiting_approval ?? 0),
        complete: Number(row?.complete ?? 0),
    };
}

// ─── Filter-dropdown options ─────────────────────────────────────────────────
export async function getPartnerOptions(): Promise<
    Array<{ code: string; name: string }>
> {
    return query<{ code: string; name: string }>(
        `SELECT code, name FROM partners WHERE is_active = 1 ORDER BY name ASC`
    );
}

export async function getSDMOptions(): Promise<
    Array<{ id: string; name: string }>
> {
    return query<{ id: string; name: string }>(
        `SELECT id, name FROM users
         WHERE role = 'SDM' AND is_active = 1
         ORDER BY name ASC`
    );
}
