// src/lib/dashboard.ts
//
// Data-access layer for the dashboard screen. One place that owns the
// stat-card counts + active-requests list. Called from:
//   - src/app/(protected)/dashboard/page.tsx (server component, on load)
//   - src/app/api/dashboard/route.ts          (JSON endpoint, for refresh)

import { query, queryOne } from "@/src/lib/db";
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

/**
 * Role-aware WHERE fragment. SDMs see their own submissions; SPECIALISTs
 * see only requests assigned to them. HR_HEAD sees all.
 * Returns `{ clause, params }` to splice into a prepared statement.
 */
function ownerScope(role: UserRole, userId: string) {
    if (role === "SDM") {
        return { clause: "AND submitted_by_id = ?", params: [userId] };
    }
    if (role === "SPECIALIST") {
        return { clause: "AND assigned_specialist_id = ?", params: [userId] };
    }
    return { clause: "", params: [] as string[] };
}

/** Start of current month as a UTC Date. */
function startOfMonth(): Date {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export async function getDashboardStats(
    role: UserRole,
    userId: string
): Promise<DashboardStats> {
    const scope = ownerScope(role, userId);
    const monthStart = startOfMonth();
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    // Request-level counts: active (in flight), red flags, green-this-month,
    // letters issued this month.
    const agg = await queryOne<{
        active: number | null;
        red_flags: number | null;
        completed: number | null;
        letters: number | null;
    }>(
        `SELECT
            COALESCE(SUM(status IN ('PENDING','IN_PROGRESS','AMBER')), 0)             AS active,
            COALESCE(SUM(status = 'RED_FLAG'), 0)                                     AS red_flags,
            COALESCE(SUM(status = 'GREEN' AND completion_date >= ?), 0)               AS completed,
            COALESCE(SUM(letter_issued_date IS NOT NULL AND letter_issued_date >= ?), 0) AS letters
         FROM bgv_requests
         WHERE 1=1 ${scope.clause}`,
        [monthStart, monthStart, ...scope.params]
    );

    // Check-level counts: pending/in-progress individual checks + overdue subset.
    // Apply the same ownership scope by joining to bgv_requests.
    const checkScope =
        role === "SDM"
            ? { clause: "AND r.submitted_by_id = ?", params: [userId] as unknown[] }
            : role === "SPECIALIST"
              ? { clause: "AND r.assigned_specialist_id = ?", params: [userId] as unknown[] }
              : { clause: "", params: [] as unknown[] };

    const checkAgg = await queryOne<{
        pending_checks: number | null;
        overdue_checks: number | null;
    }>(
        `SELECT
            COALESCE(SUM(bc.status IN ('PENDING','IN_PROGRESS')), 0)                        AS pending_checks,
            COALESCE(SUM(bc.status IN ('PENDING','IN_PROGRESS') AND bc.created_at < ?), 0)  AS overdue_checks
         FROM bgv_checks bc
         JOIN bgv_requests r ON r.id = bc.bgv_request_id
         WHERE 1=1 ${checkScope.clause}`,
        [fiveDaysAgo, ...checkScope.params]
    );

    const bl = await queryOne<{ n: number }>(
        "SELECT COUNT(*) AS n FROM candidates WHERE is_blacklisted = 1"
    );

    return {
        active: Number(agg?.active ?? 0),
        pendingChecks: Number(checkAgg?.pending_checks ?? 0),
        overdueChecks: Number(checkAgg?.overdue_checks ?? 0),
        completed: Number(agg?.completed ?? 0),
        redFlags: Number(agg?.red_flags ?? 0),
        blacklisted: Number(bl?.n ?? 0),
        lettersIssued: Number(agg?.letters ?? 0),
    };
}

// ─── Active requests (table rows) ────────────────────────────────────────────
interface RawActiveRow {
    id: string;
    request_number: string;
    status: BGVStatus;
    role_type: RoleType;
    region: Region;
    bgv_vendor: BGVVendor;
    created_at: Date;
    initiation_date: Date | null;
    candidate_name: string;
    candidate_email: string;
    partner_name: string;
    partner_code: string;
    client_name: string | null;
    checks_total: number;
    checks_cleared: number;
}

export async function getActiveRequests(
    role: UserRole,
    userId: string,
    limit = 20
): Promise<ActiveRequestRow[]> {
    const scope = ownerScope(role, userId);
    // Use interpolation for LIMIT because MySQL driver does not accept
    // parameterized LIMIT in some configs. Bound to a validated integer.
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));

    const rows = await query<RawActiveRow>(
        `SELECT
            r.id,
            r.request_number,
            r.status,
            r.role_type,
            r.region,
            r.bgv_vendor,
            r.created_at,
            r.initiation_date,
            c.name  AS candidate_name,
            c.email AS candidate_email,
            p.name  AS partner_name,
            p.code  AS partner_code,
            COALESCE(r.client_account, pc.client_name) AS client_name,
            (SELECT COUNT(*) FROM bgv_checks WHERE bgv_request_id = r.id)                    AS checks_total,
            (SELECT COUNT(*) FROM bgv_checks WHERE bgv_request_id = r.id AND status='CLEARED') AS checks_cleared
         FROM bgv_requests r
         JOIN candidates c      ON c.id = r.candidate_id
         JOIN partners   p      ON p.id = r.partner_id
         LEFT JOIN partner_clients pc ON pc.id = r.partner_client_id
         WHERE r.status NOT IN ('GREEN','BLACKLISTED')
         ${scope.clause
            .replace(/submitted_by_id/g, "r.submitted_by_id")
            .replace(/assigned_specialist_id/g, "r.assigned_specialist_id")}
         ORDER BY r.created_at DESC
         LIMIT ${safeLimit}`,
        scope.params
    );

    return rows.map((r) => ({
        id: r.id,
        requestNumber: r.request_number,
        status: r.status,
        roleType: r.role_type,
        region: r.region,
        bgvVendor: r.bgv_vendor,
        createdAt: r.created_at,
        initiationDate: r.initiation_date,
        candidate: { name: r.candidate_name, email: r.candidate_email },
        partner: { name: r.partner_name, code: r.partner_code },
        clientName: r.client_name,
        checksCleared: Number(r.checks_cleared),
        checksTotal: Number(r.checks_total),
    }));
}

// ─── Partner breakdown (mini cards on dashboard) ─────────────────────────────
export interface PartnerBreakdownRow {
    code: string;
    name: string;
    total: number;
    fte: number;
    pro: number;
    dispatch: number;
    backfill: number;
}

export async function getPartnerBreakdown(
    role: UserRole,
    userId: string
): Promise<PartnerBreakdownRow[]> {
    const scope =
        role === "SDM"
            ? { clause: "AND r.submitted_by_id = ?", params: [userId] as unknown[] }
            : role === "SPECIALIST"
              ? { clause: "AND r.assigned_specialist_id = ?", params: [userId] as unknown[] }
              : { clause: "", params: [] as unknown[] };

    const rows = await query<{
        code: string;
        name: string;
        total: number;
        fte: number;
        pro: number;
        dispatch: number;
        backfill: number;
    }>(
        `SELECT
            p.code,
            p.name,
            COUNT(r.id)                                                   AS total,
            COALESCE(SUM(r.role_type = 'FTE_W2'), 0)                       AS fte,
            COALESCE(SUM(r.role_type = 'PRO'), 0)                          AS pro,
            COALESCE(SUM(r.role_type = 'DISPATCH'), 0)                     AS dispatch,
            COALESCE(SUM(r.role_type = 'BACKFILL'), 0)                     AS backfill
         FROM partners p
         LEFT JOIN bgv_requests r
           ON r.partner_id = p.id
          AND r.status NOT IN ('GREEN','BLACKLISTED')
          ${scope.clause}
         WHERE p.is_active = 1
         GROUP BY p.id, p.code, p.name
         ORDER BY total DESC, p.name ASC`,
        scope.params
    );

    return rows.map((r) => ({
        code: r.code,
        name: r.name,
        total: Number(r.total),
        fte: Number(r.fte),
        pro: Number(r.pro),
        dispatch: Number(r.dispatch),
        backfill: Number(r.backfill),
    }));
}
