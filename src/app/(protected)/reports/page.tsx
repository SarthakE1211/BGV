// src/app/(protected)/reports/page.tsx

import Link from "next/link";
import { requireAuth } from "@/src/lib/auth.helpers";
import {
    getDailySummary,
    getPartnerProgress,
    getOverdueChecks,
    getTodayEmailLog,
    OVERDUE_DAYS,
} from "@/src/lib/report";
import PartnerTag from "@/src/components/ui/PartnerTag";

export const dynamic = "force-dynamic";

// Partner-brand colors used for the progress bar fill (matches prototype).
const PARTNER_COLOR: Record<string, string> = {
    HCL: "#3b82f6",
    COG: "#7c3aed",
    LTM: "#0891b2",
    TCS: "#ea580c",
    WIP: "#db2777",
    HEX: "#059669",
    BIR: "#ca8a04",
    MIN: "#4f46e5",
};

const TODAY_LABEL = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
});

export default async function ReportsPage() {
    await requireAuth("SPECIALIST");
    const [summary, partners, overdue, emails] = await Promise.all([
        getDailySummary(),
        getPartnerProgress(),
        getOverdueChecks(),
        getTodayEmailLog(),
    ]);

    const maxActive = Math.max(1, ...partners.map((p) => p.active));

    return (
        <>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    flexWrap: "wrap",
                    gap: 8,
                }}
            >
                <div>
                    <h3 style={{ fontSize: 15 }}>Daily BGV Status Report</h3>
                    <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}>
                        Auto-generated daily at 6:00 PM IST. Emailed to all SDMs, BGV
                        Specialists, and HR Head.
                    </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="btn btn-outline btn-sm" disabled>
                        Preview Email
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" disabled>
                        Send Now
                    </button>
                </div>
            </div>

            {/* Summary card */}
            <div className="report-card">
                <h4>Report for {TODAY_LABEL}</h4>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: 14,
                        marginTop: 10,
                    }}
                >
                    <div>
                        <div style={{ fontSize: 11, color: "var(--text-light)" }}>
                            Total Active
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>
                            {summary.totalActive}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: "var(--text-light)" }}>
                            Completed Today
                        </div>
                        <div
                            style={{ fontSize: 22, fontWeight: 700, color: "var(--success)" }}
                        >
                            {summary.completedToday}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: "var(--text-light)" }}>
                            New Requests
                        </div>
                        <div
                            style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)" }}
                        >
                            {summary.newRequestsToday}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: "var(--text-light)" }}>
                            Overdue (&gt;{OVERDUE_DAYS} days)
                        </div>
                        <div
                            style={{ fontSize: 22, fontWeight: 700, color: "var(--danger)" }}
                        >
                            {summary.overdueChecks}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: "var(--text-light)" }}>
                            Letters Issued Today
                        </div>
                        <div
                            style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}
                        >
                            {summary.lettersIssuedToday}
                        </div>
                    </div>
                </div>
            </div>

            {/* Partner progress */}
            <div className="report-card">
                <h4>Pending BGVs by Partner</h4>
                <div style={{ marginTop: 10 }}>
                    {partners.length === 0 && (
                        <div style={{ fontSize: 12, color: "var(--text-light)" }}>
                            No partners configured.
                        </div>
                    )}
                    {partners.map((p) => {
                        const pct = Math.round((p.active / maxActive) * 100);
                        const color = PARTNER_COLOR[p.code] ?? "var(--primary)";
                        return (
                            <div
                                key={p.code}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    marginBottom: 8,
                                }}
                            >
                                <span
                                    style={{
                                        width: 90,
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}
                                >
                                    {p.name}
                                </span>
                                <div className="progress-bar" style={{ flex: 1 }}>
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${pct}%`, background: color }}
                                    />
                                </div>
                                <span
                                    style={{
                                        fontSize: 11,
                                        color: "var(--text-light)",
                                        width: 90,
                                        textAlign: "right",
                                    }}
                                >
                                    {p.active} active
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Overdue items */}
            <div className="report-card">
                <h4 style={{ color: "var(--danger)" }}>
                    Overdue Items (Requires Immediate Attention)
                </h4>
                <div className="table-scroll" style={{ marginTop: 6 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Technician</th>
                                <th>Partner</th>
                                <th>Account</th>
                                <th>Pending Check</th>
                                <th>Days Overdue</th>
                                <th>Assigned</th>
                                <th>Request</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overdue.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        style={{
                                            textAlign: "center",
                                            padding: "30px 20px",
                                            color: "var(--success)",
                                        }}
                                    >
                                        ✓ No overdue checks.
                                    </td>
                                </tr>
                            )}
                            {overdue.map((o) => (
                                <tr key={o.id}>
                                    <td>
                                        <strong>{o.candidateName}</strong>
                                    </td>
                                    <td>
                                        <PartnerTag code={o.partnerCode} />
                                    </td>
                                    <td>{o.clientName ?? "—"}</td>
                                    <td>{o.checkType}</td>
                                    <td
                                        style={{
                                            color:
                                                o.daysOverdue > 7
                                                    ? "var(--danger)"
                                                    : "var(--warning)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {o.daysOverdue} days
                                    </td>
                                    <td>{o.assignedTo ?? "Unassigned"}</td>
                                    <td>
                                        <Link
                                            href={`/requests/${o.requestId}`}
                                            style={{ color: "var(--primary)" }}
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Email trigger summary */}
            <div className="report-card">
                <h4>Email Trigger Summary (Today)</h4>
                <div className="table-scroll" style={{ marginTop: 6 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Trigger</th>
                                <th>Recipient</th>
                                <th>Details</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {emails.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        style={{
                                            textAlign: "center",
                                            padding: "30px 20px",
                                            color: "var(--text-light)",
                                        }}
                                    >
                                        No emails sent today.
                                    </td>
                                </tr>
                            )}
                            {emails.map((e) => (
                                <tr key={e.id}>
                                    <td style={{ color: "var(--text-light)" }}>
                                        {new Date(e.sentAt).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </td>
                                    <td>{e.triggerType}</td>
                                    <td>{e.recipientEmail}</td>
                                    <td style={{ color: "var(--text-light)" }}>{e.subject}</td>
                                    <td>
                                        <span
                                            className={`status-badge ${
                                                e.status === "FAILED"
                                                    ? "status-red"
                                                    : "status-green"
                                            }`}
                                        >
                                            {e.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
