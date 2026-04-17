"use server";

import { requireAuth } from "@/src/lib/auth.helpers";
import { query } from "@/src/lib/db";
import {
    getDailySummary,
    getPartnerProgress,
    getOverdueChecks,
    OVERDUE_DAYS,
} from "@/src/lib/report";
import { buildDailyReportHtml } from "@/src/lib/report-email";
import { sendEmail } from "@/src/lib/email";

interface SendResult {
    sent: number;
    failed: number;
    recipients: string[];
}

/** Fetches all active users who should receive the daily report. */
async function getReportRecipients(): Promise<Array<{ name: string; email: string }>> {
    return query<{ name: string; email: string }>(
        `SELECT name, email FROM users ORDER BY name ASC`
    );
}

/** Builds and emails the daily report to all users. HR_HEAD only. */
export async function sendDailyReport(): Promise<SendResult> {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        throw new Error("Only HR Head can send the daily report manually");
    }

    return dispatchDailyReport();
}

/** Internal — can be called from cron without auth check. The daily *email*
 *  always contains the full (unscoped) view; per-user scoping only applies to
 *  the in-portal Reports page. We invoke the data helpers with HR_HEAD so the
 *  scope clause is empty. */
export async function dispatchDailyReport(): Promise<SendResult> {
    const [summary, partners, overdue, recipients] = await Promise.all([
        getDailySummary("HR_HEAD", ""),
        getPartnerProgress("HR_HEAD", ""),
        getOverdueChecks("HR_HEAD", ""),
        getReportRecipients(),
    ]);

    const dateLabel = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    const html = buildDailyReportHtml({
        summary,
        partners,
        overdue,
        dateLabel,
        overdueThreshold: OVERDUE_DAYS,
    });

    const subject = `BGV Daily Status Report — ${dateLabel}`;

    let sent = 0;
    let failed = 0;
    const recipientList: string[] = [];

    for (const r of recipients) {
        try {
            await sendEmail({
                trigger: "DAILY_REPORT",
                recipient: r.email,
                subject,
                body: html,
                bodyType: "HTML",
                status: "SENT",
            });
            sent++;
            recipientList.push(r.email);
        } catch {
            failed++;
        }
    }

    return { sent, failed, recipients: recipientList };
}
