// src/lib/request-detail.ts
//
// Aggregated fetch for the request-detail page.
// Calls Django REST API instead of direct MySQL queries.

import { api } from "@/src/lib/api-client";
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

// The Django API returns the detail with nested checks + activity in one call.
// We'll parse the combined response and split it for the three functions.

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ApiDetailResponse {
    id: string;
    request_number?: string;
    requestNumber?: string;
    status: BGVStatus;
    priority: Priority;
    bgv_type?: string;
    bgvType?: string;
    role_type?: RoleType;
    roleType?: RoleType;
    region: Region;
    bgv_vendor?: BGVVendor;
    bgvVendor?: BGVVendor;
    notes: string | null;
    created_at?: string;
    createdAt?: string;
    initiation_date?: string | null;
    initiationDate?: string | null;
    completion_date?: string | null;
    completionDate?: string | null;
    client_account?: string | null;
    clientAccount?: string | null;
    candidate: any;
    partner: any;
    client?: any;
    submitted_by?: any;
    submittedBy?: any;
    approved_by?: any;
    approvedBy?: any;
    assigned_specialist?: any;
    assignedSpecialist?: any;
    checks?: any[];
    activity?: any[];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function mapDetail(r: ApiDetailResponse): RequestDetailRow {
    const candidate = r.candidate ?? {};
    const partner = r.partner ?? {};
    const client = r.client;
    const submittedBy = r.submitted_by ?? r.submittedBy ?? {};
    const approvedBy = r.approved_by ?? r.approvedBy;
    const specialist = r.assigned_specialist ?? r.assignedSpecialist;

    return {
        id: r.id,
        requestNumber: r.request_number ?? r.requestNumber ?? "",
        status: r.status,
        priority: r.priority,
        bgvType: r.bgv_type ?? r.bgvType ?? "",
        roleType: r.role_type ?? r.roleType ?? ("FTE_W2" as RoleType),
        region: r.region,
        bgvVendor: r.bgv_vendor ?? r.bgvVendor ?? ("DISA" as BGVVendor),
        notes: r.notes,
        createdAt: new Date(r.created_at ?? r.createdAt ?? ""),
        initiationDate: (r.initiation_date ?? r.initiationDate)
            ? new Date((r.initiation_date ?? r.initiationDate)!)
            : null,
        completionDate: (r.completion_date ?? r.completionDate)
            ? new Date((r.completion_date ?? r.completionDate)!)
            : null,
        clientAccount: r.client_account ?? r.clientAccount ?? null,
        candidate: {
            id: candidate.id ?? "",
            name: candidate.name ?? "",
            email: candidate.email ?? "",
            phone: candidate.phone ?? null,
            isBlacklisted: Boolean(
                candidate.is_blacklisted ?? candidate.isBlacklisted ?? false
            ),
        },
        partner: {
            id: partner.id ?? "",
            name: partner.name ?? "",
            code: partner.code ?? "",
        },
        client: client
            ? {
                  id: client.id ?? "",
                  name: client.name ?? client.client_name ?? client.clientName ?? "",
              }
            : null,
        submittedBy: {
            id: submittedBy.id ?? "",
            name: submittedBy.name ?? "",
            email: submittedBy.email ?? "",
        },
        approvedBy: approvedBy
            ? { id: approvedBy.id ?? "", name: approvedBy.name ?? "" }
            : null,
        assignedSpecialist: specialist
            ? {
                  id: specialist.id ?? "",
                  name: specialist.name ?? "",
                  email: specialist.email ?? "",
              }
            : null,
    };
}

/**
 * Fetch full request detail. The Django API handles role-scoping via the
 * X-User-Id header. Returns null on 404 or 403.
 */
export async function getRequestDetail(
    id: string,
    role: UserRole,
    userId: string
): Promise<RequestDetailRow | null> {
    try {
        const data = await api<ApiDetailResponse>(
            `/bgv/requests/${id}/`,
            { userId }
        );
        return mapDetail(data);
    } catch (e: unknown) {
        if (
            e &&
            typeof e === "object" &&
            "status" in e &&
            ((e as { status: number }).status === 404 ||
                (e as { status: number }).status === 403)
        ) {
            return null;
        }
        throw e;
    }
}

export async function getRequestChecks(
    requestId: string,
    userId?: string
): Promise<CheckDetailRow[]> {
    // The detail endpoint returns checks nested. Fetch the detail and
    // extract the checks array.
    try {
        const data = await api<ApiDetailResponse>(
            `/bgv/requests/${requestId}/`,
            { userId }
        );

        const checks = data.checks ?? [];
        return checks.map((c: any) => ({
            id: c.id,
            checkType: c.check_type ?? c.checkType ?? "",
            requirementSource:
                c.requirement_source ?? c.requirementSource ?? null,
            status: c.status,
            startedAt: (c.started_at ?? c.startedAt)
                ? new Date((c.started_at ?? c.startedAt)!)
                : null,
            completedAt: (c.completed_at ?? c.completedAt)
                ? new Date((c.completed_at ?? c.completedAt)!)
                : null,
            remarks: c.remarks ?? null,
            assignedTo: c.assigned_to_name ?? c.assigned_to ?? c.assignedTo ?? null,
        }));
    } catch {
        return [];
    }
}

export async function getRequestActivity(
    requestId: string,
    limit = 50,
    userId?: string
): Promise<ActivityLogEntry[]> {
    try {
        const data = await api<ApiDetailResponse>(
            `/bgv/requests/${requestId}/`,
            { userId }
        );

        const activity = data.activity ?? [];
        return activity
            .slice(0, limit)
            .map((a: any) => ({
                id: a.id,
                action: a.action,
                details: a.details ?? null,
                createdAt: new Date(a.created_at ?? a.createdAt ?? ""),
                performedBy: a.performed_by ?? a.performedBy ?? "",
            }));
    } catch {
        return [];
    }
}
