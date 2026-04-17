// src/lib/tracker.ts
//
// Data access for the BGV Tracker page — flat list of bgv_checks with
// per-check filtering. Specialist and HR Head only.

import { query, queryOne } from "@/src/lib/db";
import type { CheckStatus } from "@/src/lib/enums";

export const PAGE_SIZE = 50;

export type CheckTab =
    | "all"
    | "criminal"
    | "education"
    | "employment"
    | "drug"
    | "ssn"
    | "credit"
    | "specialized";

export const TAB_LABELS: Record<CheckTab, string> = {
    all: "All Active Checks",
    criminal: "Criminal",
    education: "Education",
    employment: "Employment",
    drug: "Drug Test",
    ssn: "SSN/Address",
    credit: "Credit",
    specialized: "Specialized",
};

const TAB_LIKE: Record<Exclude<CheckTab, "all" | "specialized">, string> = {
    criminal: "%CRIMINAL%",
    education: "%EDUCATION%",
    employment: "%EMPLOYMENT%",
    drug: "%DRUG%",
    ssn: "%SSN%",
    credit: "%CREDIT%",
};

const KNOWN_TYPES = ["CRIMINAL", "EDUCATION", "EMPLOYMENT", "DRUG", "SSN", "CREDIT"];

export interface TrackerFilters {
    tab?: CheckTab;
    q?: string | null;
    partner?: string | null;     // partner code
    status?: CheckStatus | null;
    specialist?: string | null;  // users.id
}

export interface TrackerRow {
    id: string;
    candidateName: string;
    candidateEmail: string;
    partnerCode: string;
    partnerName: string;
    clientName: string | null;
    checkType: string;
    requirementSource: string | null;
    assignedTo: string | null;
    status: CheckStatus;
    completedAt: Date | null;
    remarks: string | null;
    requestId: string;
    createdAt: Date;
}

interface BuiltWhere {
    sql: string;
    params: unknown[];
}

function buildWhere(f: TrackerFilters): BuiltWhere {
    // Tracker only surfaces checks whose parent request has been *initiated*
    // (status ≠ PENDING). PENDING requests are driven from the Requests page;
    // they enter the tracker once a Specialist/HR Head clicks Initiate.
    const conds: string[] = ["r.status <> 'PENDING'"];
    const params: unknown[] = [];

    switch (f.tab) {
        case "all":
        case undefined:
            break;
        case "specialized":
            // Anything that isn't one of the standard types
            conds.push(
                `NOT (${KNOWN_TYPES.map(() => "UPPER(ch.check_type) LIKE ?").join(" OR ")})`
            );
            params.push(...KNOWN_TYPES.map((t) => `%${t}%`));
            break;
        default: {
            const like = TAB_LIKE[f.tab];
            if (like) {
                conds.push("UPPER(ch.check_type) LIKE ?");
                params.push(like);
            }
        }
    }

    if (f.partner) {
        conds.push("p.code = ?");
        params.push(f.partner);
    }
    if (f.status) {
        conds.push("ch.status = ?");
        params.push(f.status);
    }
    if (f.specialist) {
        conds.push("ch.assigned_to_id = ?");
        params.push(f.specialist);
    }
    if (f.q && f.q.trim()) {
        const like = `%${f.q.trim()}%`;
        conds.push("(c.name LIKE ? OR c.email LIKE ?)");
        params.push(like, like);
    }

    return {
        sql: conds.length ? "WHERE " + conds.join(" AND ") : "",
        params,
    };
}

export async function listChecks(
    filters: TrackerFilters,
    page: number
): Promise<{ rows: TrackerRow[]; total: number; page: number }> {
    const where = buildWhere(filters);
    const safePage = Math.max(1, Math.floor(page));
    const offset = (safePage - 1) * PAGE_SIZE;

    const base = `
        FROM bgv_checks ch
        JOIN bgv_requests r ON r.id = ch.bgv_request_id
        JOIN candidates  c  ON c.id = r.candidate_id
        JOIN partners    p  ON p.id = r.partner_id
        LEFT JOIN partner_clients pc ON pc.id = r.partner_client_id
        LEFT JOIN users  u  ON u.id = ch.assigned_to_id
        ${where.sql}
    `;

    const [countRow, rows] = await Promise.all([
        queryOne<{ n: number }>(`SELECT COUNT(*) AS n ${base}`, where.params),
        query<{
            id: string;
            candidate_name: string;
            candidate_email: string;
            partner_code: string;
            partner_name: string;
            client_name: string | null;
            check_type: string;
            requirement_source: string | null;
            assigned_to_name: string | null;
            status: CheckStatus;
            completed_at: Date | null;
            remarks: string | null;
            request_id: string;
            created_at: Date;
        }>(
            `SELECT
                ch.id,
                c.name  AS candidate_name,
                c.email AS candidate_email,
                p.code  AS partner_code,
                p.name  AS partner_name,
                COALESCE(r.client_account, pc.client_name) AS client_name,
                ch.check_type,
                ch.requirement_source,
                u.name AS assigned_to_name,
                ch.status,
                ch.completed_at,
                ch.remarks,
                ch.created_at,
                r.id   AS request_id
             ${base}
             ORDER BY ch.created_at DESC
             LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
            where.params
        ),
    ]);

    return {
        rows: rows.map((r) => ({
            id: r.id,
            candidateName: r.candidate_name,
            candidateEmail: r.candidate_email,
            partnerCode: r.partner_code,
            partnerName: r.partner_name,
            clientName: r.client_name,
            checkType: r.check_type,
            requirementSource: r.requirement_source,
            assignedTo: r.assigned_to_name,
            status: r.status,
            completedAt: r.completed_at,
            remarks: r.remarks,
            requestId: r.request_id,
            createdAt: r.created_at,
        })),
        total: Number(countRow?.n ?? 0),
        page: safePage,
    };
}

export interface CheckTabCounts {
    all: number;
    criminal: number;
    education: number;
    employment: number;
    drug: number;
    ssn: number;
    credit: number;
    specialized: number;
}

export async function getCheckTabCounts(): Promise<CheckTabCounts> {
    const row = await queryOne<{
        all: number;
        criminal: number;
        education: number;
        employment: number;
        drug: number;
        ssn: number;
        credit: number;
        specialized: number;
    }>(
        `SELECT
            COUNT(*) AS \`all\`,
            COALESCE(SUM(UPPER(ch.check_type) LIKE '%CRIMINAL%'),   0) AS criminal,
            COALESCE(SUM(UPPER(ch.check_type) LIKE '%EDUCATION%'),  0) AS education,
            COALESCE(SUM(UPPER(ch.check_type) LIKE '%EMPLOYMENT%'), 0) AS employment,
            COALESCE(SUM(UPPER(ch.check_type) LIKE '%DRUG%'),       0) AS drug,
            COALESCE(SUM(UPPER(ch.check_type) LIKE '%SSN%'),        0) AS ssn,
            COALESCE(SUM(UPPER(ch.check_type) LIKE '%CREDIT%'),     0) AS credit,
            COALESCE(SUM(
                UPPER(ch.check_type) NOT LIKE '%CRIMINAL%'   AND
                UPPER(ch.check_type) NOT LIKE '%EDUCATION%'  AND
                UPPER(ch.check_type) NOT LIKE '%EMPLOYMENT%' AND
                UPPER(ch.check_type) NOT LIKE '%DRUG%'       AND
                UPPER(ch.check_type) NOT LIKE '%SSN%'        AND
                UPPER(ch.check_type) NOT LIKE '%CREDIT%'
            ), 0) AS specialized
         FROM bgv_checks ch
         JOIN bgv_requests r ON r.id = ch.bgv_request_id
         WHERE r.status <> 'PENDING'`
    );
    return {
        all: Number(row?.all ?? 0),
        criminal: Number(row?.criminal ?? 0),
        education: Number(row?.education ?? 0),
        employment: Number(row?.employment ?? 0),
        drug: Number(row?.drug ?? 0),
        ssn: Number(row?.ssn ?? 0),
        credit: Number(row?.credit ?? 0),
        specialized: Number(row?.specialized ?? 0),
    };
}

export async function getSpecialistOptions(): Promise<
    Array<{ id: string; name: string }>
> {
    return query<{ id: string; name: string }>(
        `SELECT id, name FROM users
         WHERE role IN ('SPECIALIST','HR_HEAD') AND is_active = 1
         ORDER BY name ASC`
    );
}
