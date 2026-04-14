// BGV request write operations.
// Services throw AppError on failure — the caller (action or API route)
// adapts to its response shape.

import type { RowDataPacket } from "mysql2";
import { pool, tx } from "@/src/lib/db";
import { cuid, requestNumber } from "@/src/lib/ids";
import { resolveCheckMatrix } from "@/src/lib/check-matrix";
import { findBlacklistMatch, type BlacklistMatch } from "@/src/lib/blacklist";
import { AppError } from "@/src/lib/errors";
import type { AuthedUser } from "@/src/lib/auth.helpers";
import type { Region, Priority, RoleType } from "@/src/lib/enums";

export interface CreateRequestInput {
    candidateName: string;
    candidateEmail: string;
    candidatePhone?: string | null;
    candidateDob?: string | null; // yyyy-mm-dd
    partnerId: string;
    partnerClientId?: string | null;
    roleType: RoleType;
    region: Region;
    priority: Priority;
    notes?: string | null;
}

export interface CreateRequestResult {
    requestId: string;
    requestNumber: string;
}

/** Create a BGV request atomically. Pre-flight blacklist gate runs first
 *  and, on hit, throws `AppError("BLACKLISTED", ..., { details: { match } })`
 *  — no rows are written. */
export async function createRequest(
    input: CreateRequestInput,
    actor: AuthedUser
): Promise<CreateRequestResult> {
    const partnerClientId = input.partnerClientId?.trim() || null;
    const dob = input.candidateDob && input.candidateDob.trim() ? input.candidateDob : null;

    const match = await findBlacklistMatch(input.candidateName, input.candidateEmail);
    if (match) {
        throw new AppError("BLACKLISTED", "Candidate is blacklisted", {
            details: { match } satisfies { match: BlacklistMatch },
        });
    }

    const checks = await resolveCheckMatrix(
        input.partnerId,
        partnerClientId,
        input.region
    );
    if (checks.length === 0) {
        throw new AppError(
            "VALIDATION",
            "No checks configured for this partner/client/region combination",
            { field: "partnerId" }
        );
    }

    const bgvVendor = input.region === "CANADA" ? "PRECISEHIRE" : "DISA";

    return tx(async (conn) => {
        // 1. Candidate upsert (look up by email; create if absent).
        const [existingRows] = await conn.execute<(RowDataPacket & { id: string })[]>(
            `SELECT id FROM candidates WHERE LOWER(email) = LOWER(?) LIMIT 1`,
            [input.candidateEmail]
        );
        let candidateId: string;
        if (existingRows.length) {
            candidateId = existingRows[0].id;
        } else {
            candidateId = cuid();
            await conn.execute(
                `INSERT INTO candidates (id, name, email, phone, date_of_birth, is_blacklisted)
                 VALUES (?, ?, ?, ?, ?, 0)`,
                [
                    candidateId,
                    input.candidateName,
                    input.candidateEmail,
                    input.candidatePhone || null,
                    dob,
                ]
            );
        }

        // 2. Generate request number (count requests already in this year).
        const year = new Date().getUTCFullYear();
        const [seqRows] = await conn.execute<(RowDataPacket & { n: number })[]>(
            `SELECT COUNT(*) AS n FROM bgv_requests WHERE request_number LIKE ?`,
            [`BGV-${year}-%`]
        );
        const reqNum = requestNumber(year, Number(seqRows[0]?.n ?? 0) + 1);

        // 3. Request row.
        const requestId = cuid();
        await conn.execute(
            `INSERT INTO bgv_requests
                 (id, request_number, candidate_id, partner_id, partner_client_id,
                  submitted_by_id, role_type, region, bgv_vendor, status, priority,
                  bgv_type, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
            [
                requestId,
                reqNum,
                candidateId,
                input.partnerId,
                partnerClientId,
                actor.id,
                input.roleType,
                input.region,
                bgvVendor,
                input.priority,
                partnerClientId ? "CUSTOM" : "STANDARD",
                input.notes || null,
            ]
        );

        // 4. One bgv_checks row per resolved check type.
        for (const c of checks) {
            await conn.execute(
                `INSERT INTO bgv_checks
                     (id, bgv_request_id, check_type, requirement_source, status)
                 VALUES (?, ?, ?, ?, 'PENDING')`,
                [cuid(), requestId, c.checkType, c.source]
            );
        }

        // 5. Activity log.
        await conn.execute(
            `INSERT INTO activity_logs
                 (id, bgv_request_id, performed_by_id, action, details)
             VALUES (?, ?, ?, 'REQUEST_SUBMITTED', ?)`,
            [
                cuid(),
                requestId,
                actor.id,
                `Blacklist: CLEAR. ${checks.length} check${checks.length === 1 ? "" : "s"} loaded.`,
            ]
        );

        return { requestId, requestNumber: reqNum };
    });
}

/** Approve a PENDING request. HR_HEAD-only policy is enforced here, not
 *  in the caller, so webhooks/cron can't accidentally bypass it. */
export async function approveRequest(
    requestId: string,
    actor: AuthedUser
): Promise<void> {
    if (actor.role !== "HR_HEAD") {
        throw new AppError("FORBIDDEN", "Only HR Head can approve requests");
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.execute<(RowDataPacket & { id: string })[]>(
            `SELECT id FROM bgv_requests WHERE id = ? LIMIT 1`,
            [requestId]
        );
        if (rows.length === 0) {
            throw new AppError("NOT_FOUND", "Request not found");
        }

        await conn.execute(
            `UPDATE bgv_requests
             SET status = 'IN_PROGRESS', approved_by_id = ?, initiation_date = NOW(3)
             WHERE id = ?`,
            [actor.id, requestId]
        );
        await conn.execute(
            `INSERT INTO activity_logs (id, bgv_request_id, performed_by_id, action, details)
             VALUES (?, ?, ?, 'REQUEST_APPROVED', ?)`,
            [cuid(), requestId, actor.id, `Approved by ${actor.name} (HR_HEAD)`]
        );
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}
