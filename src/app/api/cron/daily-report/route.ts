// src/app/api/cron/daily-report/route.ts
// POST /api/cron/daily-report
// Intended to be called by a cron job at 18:00 IST daily.
// Secured with a shared CRON_SECRET header.

import { NextRequest, NextResponse } from "next/server";
import { dispatchDailyReport } from "@/src/actions/reports";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    // Simple bearer-token guard so this can't be called by anyone.
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.get("authorization") ?? "";
        if (auth !== `Bearer ${secret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const result = await dispatchDailyReport();
        logger.info("cron.daily-report dispatched", { sent: result.sent, failed: result.failed });
        return NextResponse.json({ ok: true, ...result });
    } catch (err) {
        logger.error("cron.daily-report failed", { err });
        return NextResponse.json(
            { ok: false, error: String(err) },
            { status: 500 }
        );
    }
}
