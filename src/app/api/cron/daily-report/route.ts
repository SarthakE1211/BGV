// POST /api/cron/daily-report
// Proxies to Django's daily report endpoint. Called by cron at 18:00 IST.

import { NextRequest, NextResponse } from "next/server";
import { api } from "@/src/lib/api-client";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.get("authorization") ?? "";
        if (auth !== `Bearer ${secret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        // Django handles compiling + emailing. We just trigger it.
        const result = await api<{ sent: number; failed: number; recipients: string[] }>(
            "/reports/send-daily/",
            { method: "POST" }
        );
        logger.info("cron.daily-report dispatched", result);
        return NextResponse.json({ ok: true, ...result });
    } catch (err) {
        logger.error("cron.daily-report failed", { err });
        return NextResponse.json(
            { ok: false, error: String(err) },
            { status: 500 }
        );
    }
}
