// src/lib/request-detail.ts
//
// Aggregated fetch for the request-detail page. One module owns:
//   - the request + joined candidate/partner/client/SDM/approver
//   - the list of bgv_checks for the request
//   - the activity log feed
//
// Used by both the server page and the GET /api/requests/[id] endpoint.

import { query, queryOne } from "@/src/lib/db";
import type {
    BGVStatus,
    BGVVendor,
    Region,
    RoleType,
    Priority,
    CheckStatus,
    UserRole,
} from "@/src/lib/enums";

export interface RequestDetailRow {
    id: string;
    requestNumber: string;
    status: BGVStatus;
    priority: Priority;
    bgvType: string;
    roleType: RoleType;
    region: Region;
    bgvVendor: BGVVendor;
    notes: string | null;
    createdAt: Date;
    initiationDate: Date | null;
    completionDate: Date | null;
    clientAccount: string | null;
    candidate: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        isBlacklisted: boolean;
    };
    partner: { id: string; name: string; code: string };
    client: { id: string; name: string } | null;
    submittedBy: { id: string; name: string; email: string };
    approvedBy: { id: string; name: string } | null;
    assignedSpecialist: { id: string; name: string; email: string } | null;
}

export interface CheckDetailRow {
    id: string;
    checkType: string;
    requirementSource: string | null;
    status: CheckStatus;
    startedAt: Date | null;
    completedAt: Date | null;
    remarks: string | null;
    assignedTo: string | null;
}

export interface ActivityLogEntry {
    id: string;
    action: string;
    details: string | null;
    createdAt: Date;
    performedBy: string;
}

interface RequestRowRaw {
    id: string;
    request_number: string;
    status: BGVStatus;
    priority: Priority;
    bgv_type: string;
    role_type: RoleType;
    region: Region;
    bgv_vendor: BGVVendor;
    notes: string | null;
    created_at: Date;
    initiation_date: Date | null;
    completion_date: Date | null;
    candidate_id: string;
    candidate_name: string;
    candidate_email: string;
    candidate_phone: string | null;
    candidate_blacklisted: 0 | 1;
    partner_id: string;
    partner_name: string;
    partner_code: string;
    client_id: string | null;
    client_name: string | null;
    client_account: string | null;
    submitted_by_id: string;
    submitted_by_name: string;
    submitted_by_email: string;
    approved_by_id: string | null;
    approved_by_name: string | null;
    assigned_specialist_id: string | null;
    assigned_specialist_name: string | null;
    assigned_specialist_email: string | null;
}

/**
 * Fetch full request detail. Enforces SDM scope: an SDM only sees their
 * own requests; everyone else sees all. Returns null on miss / forbidden.
 */
export async function getRequestDetail(
    id: string,
    role: UserRole,
    userId: string
): Promise<RequestDetailRow | null> {
    const row = await queryOne<RequestRowRaw>(
        `SELECT
            r.id, r.request_number, r.status, r.priority, r.bgv_type,
            r.role_type, r.region, r.bgv_vendor, r.notes,
            r.created_at, r.initiation_date, r.completion_date,
            c.id   AS candidate_id,
            c.name AS candidate_name,
            c.email AS candidate_email,
            c.phone AS candidate_phone,
            c.is_blacklisted AS candidate_blacklisted,
            p.id   AS partner_id,
            p.name AS partner_name,
            p.code AS partner_code,
            r.client_account,
            pc.id          AS client_id,
            pc.client_name AS client_name,
            sb.id    AS submitted_by_id,
            sb.name  AS submitted_by_name,
            sb.email AS submitted_by_email,
            ab.id   AS approved_by_id,
            ab.name AS approved_by_name,
            asp.id    AS assigned_specialist_id,
            asp.name  AS assigned_specialist_name,
            asp.email AS assigned_specialist_email
         FROM bgv_requests r
         JOIN candidates c ON c.id = r.candidate_id
         JOIN partners   p ON p.id = r.partner_id
         JOIN users      sb ON sb.id = r.submitted_by_id
         LEFT JOIN partner_clients pc ON pc.id = r.partner_client_id
         LEFT JOIN users           ab ON ab.id = r.approved_by_id
         LEFT JOIN users           asp ON asp.id = r.assigned_specialist_id
         WHERE r.id = ?
         LIMIT 1`,
        [id]
    );
    if (!row) return null;

    if (role === "SDM" && row.submitted_by_id !== userId) return null;
    if (role === "SPECIALIST" && row.assigned_specialist_id !== userId) return null;

    return {
        id: row.id,
        requestNumber: row.request_number,
        status: row.status,
        priority: row.priority,
        bgvType: row.bgv_type,
        roleType: row.role_type,
        region: row.region,
        bgvVendor: row.bgv_vendor,
        notes: row.notes,
        createdAt: row.created_at,
        initiationDate: row.initiation_date,
        completionDate: row.completion_date,
        candidate: {
            id: row.candidate_id,
            name: row.candidate_name,
            email: row.candidate_email,
            phone: row.candidate_phone,
            isBlacklisted: Boolean(row.candidate_blacklisted),
        },
        partner: { id: row.partner_id, name: row.partner_name, code: row.partner_code },
        clientAccount: row.client_account,
        client: row.client_name || row.client_account
            ? { id: row.client_id ?? "", name: row.client_name ?? row.client_account ?? "" }
            : null,
        submittedBy: {
            id: row.submitted_by_id,
            name: row.submitted_by_name,
            email: row.submitted_by_email,
        },
        approvedBy: row.approved_by_id
            ? { id: row.approved_by_id, name: row.approved_by_name ?? "" }
            : null,
        assignedSpecialist: row.assigned_specialist_id
            ? {
                  id: row.assigned_specialist_id,
                  name: row.assigned_specialist_name ?? "",
                  email: row.assigned_specialist_email ?? "",
              }
            : null,
    };
}

export async function getRequestChecks(requestId: string): Promise<CheckDetailRow[]> {
    const rows = await query<{
        id: string;
        check_type: string;
        requirement_source: string | null;
        status: CheckStatus;
        started_at: Date | null;
        completed_at: Date | null;
        remarks: string | null;
        assigned_to_name: string | null;
    }>(
        `SELECT
            ch.id, ch.check_type, ch.requirement_source, ch.status,
            ch.started_at, ch.completed_at, ch.remarks,
            u.name AS assigned_to_name
         FROM bgv_checks ch
         LEFT JOIN users u ON u.id = ch.assigned_to_id
         WHERE ch.bgv_request_id = ?
         ORDER BY ch.created_at ASC`,
        [requestId]
    );
    return rows.map((r) => ({
        id: r.id,
        checkType: r.check_type,
        requirementSource: r.requirement_source,
        status: r.status,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        remarks: r.remarks,
        assignedTo: r.assigned_to_name,
    }));
}

export async function getRequestActivity(
    requestId: string,
    limit = 50
): Promise<ActivityLogEntry[]> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
    const rows = await query<{
        id: string;
        action: string;
        details: string | null;
        created_at: Date;
        performed_by: string;
    }>(
        `SELECT
            a.id, a.action, a.details, a.created_at,
            u.name AS performed_by
         FROM activity_logs a
         JOIN users u ON u.id = a.performed_by_id
         WHERE a.bgv_request_id = ?
         ORDER BY a.created_at DESC
         LIMIT ${safeLimit}`,
        [requestId]
    );
    return rows.map((r) => ({
        id: r.id,
        action: r.action,
        details: r.details,
        createdAt: r.created_at,
        performedBy: r.performed_by,
    }));
}
