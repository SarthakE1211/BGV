"use server";

import { requireAuth } from "@/src/lib/auth.helpers";
import { api, ApiError } from "@/src/lib/api-client";

interface SendResult {
    sent: number;
    failed: number;
    recipients: string[];
}

/** Triggers the daily report via Django. HR_HEAD only. */
export async function sendDailyReport(): Promise<SendResult> {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        throw new Error("Only HR Head can send the daily report manually");
    }

    try {
        return await api<SendResult>("/reports/send-daily/", {
            method: "POST",
            userId: user.id,
        });
    } catch (e) {
        if (e instanceof ApiError) {
            throw new Error(e.message);
        }
        throw e;
    }
}
