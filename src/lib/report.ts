// src/lib/report.ts
//
// Daily report aggregates: per-partner active counts, overdue checks
// (older than N days), and today's email log.

import { query, queryOne } from "@/src/lib/db";
import type { CheckStatus, UserRole } from "@/src/lib/enums";

export const OVERDUE_DAYS = 5;

export interface DailySummary {
    totalActive: number;
    completedToday: number;
    newRequestsToday: number;
    overdueChecks: number;
    lettersIssuedToday: number;
}

/** Scope the report data by viewer: SDMs see only their own submissions,
 *  SPECIALISTs only their assigned requests. HR_HEAD sees everything. */
function reportScope(role: UserRole, userId: string, alias = "") {
    const col = (c: string) => (alias ? `${alias}.${c}` : c);
    if (role === "SDM") {
        return { clause: `AND ${col("submitted_by_id")} = ?`, params: [userId] as unknown[] };
    }
    if (role === "SPECIALIST") {
        return {
            clause: `AND ${col("assigned_specialist_id")} = ?`,
            params: [userId] as unknown[],
        };
    }
    return { clause: "", params: [] as unknown[] };
}

export async function getDailySummary(
    role: UserRole,
    userId: string
): Promise<DailySummary> {
    const scope = reportScope(role, userId);
    const row = await queryOne<{
        total_active: number | null;
        completed_today: number | null;
        new_today: number | null;
        letters_today: number | null;
    }>(
        `SELECT
            COALESCE(SUM(status IN ('PENDING','IN_PROGRESS','AMBER')), 0)                 AS total_active,
            COALESCE(SUM(status = 'GREEN' AND completion_date >= CURRENT_DATE), 0)        AS completed_today,
            COALESCE(SUM(created_at >= CURRENT_DATE), 0)                                  AS new_today,
            COALESCE(SUM(letter_issued_date IS NOT NULL AND letter_issued_date >= CURRENT_DATE), 0) AS letters_today
         FROM bgv_requests
         WHERE 1=1 ${scope.clause}`,
        scope.params
    );

    // Overdue checks need the join to bgv_requests to apply the scope.
    const checkScope = reportScope(role, userId, "r");
    const overdueRow = await queryOne<{ n: number }>(
        `SELECT COUNT(*) AS n
         FROM bgv_checks ch
         JOIN bgv_requests r ON r.id = ch.bgv_request_id
         WHERE ch.status IN ('PENDING','IN_PROGRESS')
           AND COALESCE(ch.started_at, ch.created_at) < (NOW() - INTERVAL ? DAY)
           ${checkScope.clause}`,
        [OVERDUE_DAYS, ...checkScope.params]
    );

    return {
        totalActive: Number(row?.total_active ?? 0),
        completedToday: Number(row?.completed_today ?? 0),
        newRequestsToday: Number(row?.new_today ?? 0),
        overdueChecks: Number(overdueRow?.n ?? 0),
        lettersIssuedToday: Number(row?.letters_today ?? 0),
    };
}

export interface PartnerProgressRow {
    code: string;
    name: string;
    active: number;
}

export interface OverdueRow {
    id: string;
    candidateName: string;
    partnerCode: string;
    clientName: string | null;
    checkType: string;
    daysOverdue: number;
    assignedTo: string | null;
    requestId: string;
}

export interface EmailLogRow {
    id: string;
    sentAt: Date;
    triggerType: string;
    recipientEmail: string;
    subject: string;
    status: string;
}

export async function getPartnerProgress(
    role: UserRole,
    userId: string
): Promise<PartnerProgressRow[]> {
    const scope = reportScope(role, userId, "r");
    return query<PartnerProgressRow>(
        `SELECT
            p.code,
            p.name,
            COALESCE(COUNT(r.id), 0) AS active
         FROM partners p
         LEFT JOIN bgv_requests r
             ON r.partner_id = p.id
            AND r.status NOT IN ('GREEN','BLACKLISTED')
            ${scope.clause}
         WHERE p.is_active = 1
         GROUP BY p.id, p.code, p.name
         ORDER BY active DESC, p.name ASC`,
        scope.params
    );
}

export async function getOverdueChecks(
    role: UserRole,
    userId: string,
    days = OVERDUE_DAYS
): Promise<OverdueRow[]> {
    const scope = reportScope(role, userId, "r");
    const rows = await query<{
        id: string;
        candidate_name: string;
        partner_code: string;
        client_name: string | null;
        check_type: string;
        days_overdue: number;
        assigned_to: string | null;
        request_id: string;
    }>(
        `SELECT
            ch.id,
            c.name  AS candidate_name,
            p.code  AS partner_code,
            pc.client_name,
            ch.check_type,
            DATEDIFF(NOW(), COALESCE(ch.started_at, ch.created_at)) AS days_overdue,
            u.name  AS assigned_to,
            r.id    AS request_id
         FROM bgv_checks ch
         JOIN bgv_requests r ON r.id = ch.bgv_request_id
         JOIN candidates  c  ON c.id = r.candidate_id
         JOIN partners    p  ON p.id = r.partner_id
         LEFT JOIN partner_clients pc ON pc.id = r.partner_client_id
         LEFT JOIN users  u  ON u.id = ch.assigned_to_id
         WHERE ch.status IN ('PENDING','IN_PROGRESS')
           AND COALESCE(ch.started_at, ch.created_at) < (NOW() - INTERVAL ? DAY)
           ${scope.clause}
         ORDER BY days_overdue DESC, c.name ASC
         LIMIT 100`,
        [days, ...scope.params]
    );
    return rows.map((r) => ({
        id: r.id,
        candidateName: r.candidate_name,
        partnerCode: r.partner_code,
        clientName: r.client_name,
        checkType: r.check_type,
        daysOverdue: Number(r.days_overdue),
        assignedTo: r.assigned_to,
        requestId: r.request_id,
    }));
}

export async function getTodayEmailLog(
    role: UserRole,
    userId: string
): Promise<EmailLogRow[]> {
    // For non-HR users, restrict to emails tied to requests they own/are assigned.
    // Emails with NULL bgv_request_id (e.g. DAILY_REPORT) are hidden from them.
    const scope = reportScope(role, userId, "r");
    const join =
        role === "HR_HEAD"
            ? ""
            : `JOIN bgv_requests r ON r.id = el.bgv_request_id`;

    const rows = await query<{
        id: string;
        sent_at: Date;
        trigger_type: string;
        recipient_email: string;
        subject: string;
        status: string;
    }>(
        `SELECT el.id, el.sent_at, el.trigger_type, el.recipient_email, el.subject, el.status
         FROM email_logs el
         ${join}
         WHERE el.sent_at >= CURRENT_DATE
         ${scope.clause}
         ORDER BY el.sent_at DESC
         LIMIT 100`,
        scope.params
    );
    return rows.map((r) => ({
        id: r.id,
        sentAt: r.sent_at,
        triggerType: r.trigger_type,
        recipientEmail: r.recipient_email,
        subject: r.subject,
        status: r.status,
    }));
}

export interface CheckStatusBreakdown {
    status: CheckStatus;
    n: number;
}

export async function getCheckStatusBreakdown(
    role: UserRole,
    userId: string
): Promise<CheckStatusBreakdown[]> {
    const scope = reportScope(role, userId, "r");
    return query<CheckStatusBreakdown>(
        `SELECT ch.status, COUNT(*) AS n
         FROM bgv_checks ch
         JOIN bgv_requests r ON r.id = ch.bgv_request_id
         WHERE 1=1 ${scope.clause}
         GROUP BY ch.status`,
        scope.params
    );
}
