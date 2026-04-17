// src/lib/email.ts
//
// Centralized email gateway. For now this just records the trigger to
// `email_logs` (so the Daily Report page has data) and console-logs the
// payload. Wire real Microsoft Graph send by replacing the body of
// `dispatch()` — every call site already passes the right shape.

import { execute } from "@/src/lib/db";
import { cuid } from "@/src/lib/ids";
import { logger } from "@/src/lib/logger";
import { sendMail } from "@/src/lib/graph";
import { getSetting, settingKeyForTrigger } from "@/src/lib/settings";

export type EmailTrigger =
    | "REQUEST_SUBMITTED"
    | "REQUEST_APPROVED"
    | "CHECK_CLEARED"
    | "CHECK_FAILED"
    | "ALL_CHECKS_GREEN"
    | "CANDIDATE_BLACKLISTED"
    | "DAILY_REPORT"
    | "SDM_UPDATE"
    | "CANDIDATE_INITIATED"
    | "CANDIDATE_LETTER_ISSUED";

export interface EmailPayload {
    trigger: EmailTrigger;
    requestId?: string | null;
    recipient: string;
    subject: string;
    /** Optional body — not stored, just logged. */
    body?: string;
    /** "Text" | "HTML". Defaults to "Text". */
    bodyType?: "Text" | "HTML";
    /** "SENT" | "FAILED" | "QUEUED". Defaults to "SENT" since we no-op. */
    status?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
    // Master kill-switch — the "Outlook Email Triggers" toggle at /settings.
    // When off, nothing leaves the app; we still log the attempt so the
    // Daily Report / audit trail reflect that the business event happened.
    const outlookEnabled = await getSetting("m365.outlook_email").catch(() => true);
    if (!outlookEnabled) {
        await execute(
            `INSERT INTO email_logs
                 (id, bgv_request_id, trigger_type, recipient_email, subject, status, sent_at)
             VALUES (?, ?, ?, ?, ?, 'SKIPPED', NOW(3))`,
            [
                cuid(),
                payload.requestId ?? null,
                payload.trigger,
                payload.recipient,
                payload.subject,
            ]
        );
        logger.info("email.skipped (outlook master off)", { trigger: payload.trigger });
        return;
    }

    // Per-trigger gate from the Notification Rules section. Triggers that
    // map to a key get gated; always-on triggers (REQUEST_SUBMITTED,
    // REQUEST_APPROVED, SDM_UPDATE, candidate-facing) return null and go through.
    const gateKey = settingKeyForTrigger(payload.trigger);
    if (gateKey) {
        const enabled = await getSetting(gateKey).catch(() => true);
        if (!enabled) {
            await execute(
                `INSERT INTO email_logs
                     (id, bgv_request_id, trigger_type, recipient_email, subject, status, sent_at)
                 VALUES (?, ?, ?, ?, ?, 'SKIPPED', NOW(3))`,
                [
                    cuid(),
                    payload.requestId ?? null,
                    payload.trigger,
                    payload.recipient,
                    payload.subject,
                ]
            );
            logger.info("email.skipped (toggle disabled)", {
                trigger: payload.trigger,
                key: gateKey,
            });
            return;
        }
    }

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
        logger.error("email.dispatch failed", {
            err,
            trigger: payload.trigger,
            recipient: payload.recipient,
        });
        // Record the failed attempt, then rethrow so callers can count failures.
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
        throw err;
    }
}

async function dispatch(payload: EmailPayload) {
    logger.info("email.dispatch", {
        trigger: payload.trigger,
        recipient: payload.recipient,
        subject: payload.subject,
    });

    await sendMail({
        to: payload.recipient,
        subject: payload.subject,
        body: payload.body ?? "",
        bodyType: payload.bodyType ?? "Text",
    });
}
