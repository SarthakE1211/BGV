// src/lib/email.ts
//
// Centralized email gateway. For now this just records the trigger to
// `email_logs` (so the Daily Report page has data) and console-logs the
// payload. Wire real Microsoft Graph send by replacing the body of
// `dispatch()` — every call site already passes the right shape.

import { execute } from "@/src/lib/db";
import { cuid } from "@/src/lib/ids";

export type EmailTrigger =
    | "REQUEST_SUBMITTED"
    | "REQUEST_APPROVED"
    | "CHECK_CLEARED"
    | "CHECK_FAILED"
    | "ALL_CHECKS_GREEN"
    | "CANDIDATE_BLACKLISTED"
    | "DAILY_REPORT";

export interface EmailPayload {
    trigger: EmailTrigger;
    requestId?: string | null;
    recipient: string;
    subject: string;
    /** Optional body — not stored, just logged. */
    body?: string;
    /** "SENT" | "FAILED" | "QUEUED". Defaults to "SENT" since we no-op. */
    status?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
    try {
        await dispatch(payload);
        await execute(
            `INSERT INTO email_logs
                 (id, bgv_request_id, trigger_type, recipient_email, subject, status, sent_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(3))`,
            [
                cuid(),
                payload.requestId ?? null,
                payload.trigger,
                payload.recipient,
                payload.subject,
                payload.status ?? "SENT",
            ]
        );
    } catch (err) {
        console.error("[email] dispatch failed:", err);
        // Still record the attempt
        await execute(
            `INSERT INTO email_logs
                 (id, bgv_request_id, trigger_type, recipient_email, subject, status, sent_at)
             VALUES (?, ?, ?, ?, ?, 'FAILED', NOW(3))`,
            [
                cuid(),
                payload.requestId ?? null,
                payload.trigger,
                payload.recipient,
                payload.subject,
            ]
        );
    }
}

async function dispatch(payload: EmailPayload) {
    // TODO: replace with Microsoft Graph send via lib/graph.ts.
    console.info(
        `[email] ${payload.trigger} → ${payload.recipient} :: ${payload.subject}`
    );
}
