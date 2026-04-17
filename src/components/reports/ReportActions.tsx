"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { sendDailyReport } from "@/src/actions/reports";
import type { UserRole } from "@/src/lib/enums";

export default function ReportActions({ role }: { role: UserRole }) {
    const [sending, startSend] = useTransition();
    const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
    const canSend = role === "HR_HEAD";

    const handleSend = () => {
        setResult(null);
        startSend(async () => {
            try {
                const r = await sendDailyReport();
                setResult({ sent: r.sent, failed: r.failed });
                if (r.failed > 0) {
                    toast.error(
                        `Report sent to ${r.sent} recipient${r.sent !== 1 ? "s" : ""}, but ${r.failed} failed. Check email logs.`,
                        { duration: 6000 }
                    );
                } else {
                    toast.success(`Report sent to ${r.sent} recipient${r.sent !== 1 ? "s" : ""}.`);
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : "Failed to send report";
                toast.error(msg, { duration: 8000 });
            }
        });
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ display: "flex", gap: 6 }}>
                <a
                    href="/api/reports/preview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                >
                    Preview Email
                </a>
                {canSend && (
                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={sending}
                        onClick={handleSend}
                    >
                        {sending ? "Sending…" : "Send Now"}
                    </button>
                )}
            </div>
            {canSend && result && result.failed === 0 && (
                <span style={{ fontSize: 11, color: "var(--success)" }}>
                    ✓ Sent to {result.sent} recipient{result.sent !== 1 ? "s" : ""}
                </span>
            )}
        </div>
    );
}
