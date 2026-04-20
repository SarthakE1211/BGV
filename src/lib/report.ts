// src/lib/report.ts
//
// Daily report aggregates: per-partner active counts, overdue checks,
// and today's email log.
// Calls Django REST API instead of direct MySQL queries.

import { api } from "@/src/lib/api-client";
import type { CheckStatus, UserRole } from "@/src/lib/enums";

export const OVERDUE_DAYS = 5;

export interface DailySummary {
    totalActive: number;
    completedToday: number;
    newRequestsToday: number;
    overdueChecks: number;
    lettersIssuedToday: number;
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

export async function getDailySummary(
    role: UserRole,
    userId: string
): Promise<DailySummary> {
    const data = await api<{
        total_active?: number;
        totalActive?: number;
        completed_today?: number;
        completedToday?: number;
        new_requests_today?: number;
        newRequestsToday?: number;
        overdue_checks?: number;
        overdueChecks?: number;
        letters_issued_today?: number;
        lettersIssuedToday?: number;
    }>("/reports/daily-summary/", { userId });

    return {
        totalActive: Number(data.total_active ?? data.totalActive ?? 0),
        completedToday: Number(data.completed_today ?? data.completedToday ?? 0),
        newRequestsToday: Number(
            data.new_requests_today ?? data.newRequestsToday ?? 0
        ),
        overdueChecks: Number(data.overdue_checks ?? data.overdueChecks ?? 0),
        lettersIssuedToday: Number(
            data.letters_issued_today ?? data.lettersIssuedToday ?? 0
        ),
    };
}

export async function getPartnerProgress(
    role: UserRole,
    userId: string
): Promise<PartnerProgressRow[]> {
    const rows = await api<PartnerProgressRow[]>(
        "/reports/partner-progress/",
        { userId }
    );
    return rows.map((r) => ({
        code: r.code,
        name: r.name,
        active: Number(r.active ?? 0),
    }));
}

export async function getOverdueChecks(
    role: UserRole,
    userId: string,
    days = OVERDUE_DAYS
): Promise<OverdueRow[]> {
    interface ApiOverdueRow {
        id: string;
        candidate_name?: string;
        candidateName?: string;
        partner_code?: string;
        partnerCode?: string;
        client_name?: string | null;
        clientName?: string | null;
        check_type?: string;
        checkType?: string;
        days_overdue?: number;
        daysOverdue?: number;
        assigned_to?: string | null;
        assignedTo?: string | null;
        request_id?: string;
        requestId?: string;
    }

    const rows = await api<ApiOverdueRow[]>("/reports/overdue-checks/", {
        userId,
        params: { days },
    });

    return rows.map((r) => ({
        id: r.id,
        candidateName: r.candidate_name ?? r.candidateName ?? "",
        partnerCode: r.partner_code ?? r.partnerCode ?? "",
        clientName: r.client_name ?? r.clientName ?? null,
        checkType: r.check_type ?? r.checkType ?? "",
        daysOverdue: Number(r.days_overdue ?? r.daysOverdue ?? 0),
        assignedTo: r.assigned_to ?? r.assignedTo ?? null,
        requestId: r.request_id ?? r.requestId ?? "",
    }));
}

export async function getTodayEmailLog(
    role: UserRole,
    userId: string
): Promise<EmailLogRow[]> {
    interface ApiEmailRow {
        id: string;
        sent_at?: string;
        sentAt?: string;
        trigger_type?: string;
        triggerType?: string;
        recipient_email?: string;
        recipientEmail?: string;
        subject: string;
        status: string;
    }

    const rows = await api<ApiEmailRow[]>("/reports/email-log/", { userId });

    return rows.map((r) => ({
        id: r.id,
        sentAt: new Date(r.sent_at ?? r.sentAt ?? ""),
        triggerType: r.trigger_type ?? r.triggerType ?? "",
        recipientEmail: r.recipient_email ?? r.recipientEmail ?? "",
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
    // The dashboard endpoint includes check status data. If there's a
    // dedicated endpoint, use it. Otherwise derive from the dashboard.
    const data = await api<{
        stats?: { check_breakdown?: CheckStatusBreakdown[] };
    }>("/reports/dashboard/", { userId });

    if (data.stats?.check_breakdown) {
        return data.stats.check_breakdown.map((r) => ({
            status: r.status,
            n: Number(r.n ?? 0),
        }));
    }

    // Fallback: return empty if the dashboard doesn't include breakdown
    return [];
}
