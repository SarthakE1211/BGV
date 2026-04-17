// src/app/api/reports/preview/route.ts
// GET /api/reports/preview — renders the daily report as HTML (opens in new tab).

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import {
    getDailySummary,
    getPartnerProgress,
    getOverdueChecks,
    OVERDUE_DAYS,
} from "@/src/lib/report";
import { buildDailyReportHtml } from "@/src/lib/report-email";

export const dynamic = "force-dynamic";

export async function GET() {
    let user;
    try {
        user = await requireAuth();
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [summary, partners, overdue] = await Promise.all([
        getDailySummary(user.role, user.id),
        getPartnerProgress(user.role, user.id),
        getOverdueChecks(user.role, user.id),
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

    return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}
