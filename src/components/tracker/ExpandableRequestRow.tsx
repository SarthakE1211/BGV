"use client";

import { useTransition } from "react";
import Link from "next/link";
import StatusBadge from "@/src/components/ui/StatusBadge";
import PartnerTag from "@/src/components/ui/PartnerTag";
import CheckActions from "@/src/components/checks/CheckActions";
import { assignSpecialistToRequest } from "@/src/actions/checks";
import type { TrackerRow } from "@/src/lib/tracker";
import type { CheckStatus } from "@/src/lib/enums";

interface Props {
    requestId: string;
    candidateName: string;
    candidateEmail: string;
    partnerCode: string;
    clientName: string | null;
    checks: TrackerRow[];
    canActOnChecks: boolean;
    open: boolean;
    onToggle: () => void;
    specialists: Array<{ id: string; name: string }>;
}

const STATUS_ORDER: CheckStatus[] = ["FAILED", "IN_PROGRESS", "PENDING", "CLEARED"];

function overallStatus(checks: TrackerRow[]): CheckStatus {
    for (const s of STATUS_ORDER) {
        if (checks.some((c) => c.status === s)) return s;
    }
    return "CLEARED";
}

/** Format a Date as local-timezone timestamp, e.g. "Apr 12, 2026, 3:45 PM IST" */
function localTimestamp(date: Date): string {
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
    }).format(date);
}

const COLS = 6;

export default function ExpandableRequestRow({
    requestId,
    candidateName,
    candidateEmail,
    partnerCode,
    clientName,
    checks,
    canActOnChecks,
    open,
    onToggle,
    specialists,
}: Props) {
    const [assigning, startAssign] = useTransition();

    const cleared = checks.filter((c) => c.status === "CLEARED").length;
    const failed  = checks.filter((c) => c.status === "FAILED").length;
    const pending = checks.filter((c) => c.status === "PENDING" || c.status === "IN_PROGRESS").length;
    const total   = checks.length;
    const overall = overallStatus(checks);

    // Current assigned specialist: the one most checks share (or blank)
    const assignedIds = checks.map((c) => c.assignedTo).filter(Boolean) as string[];
    const currentSpecialistName = assignedIds.length > 0 ? assignedIds[0] : null;
    // Find the id for the current specialist name
    const currentSpecialistId =
        specialists.find((s) => s.name === currentSpecialistName)?.id ?? "";

    const isOverdue =
        overall !== "FAILED" &&
        overall !== "CLEARED" &&
        checks.some(
            (c) =>
                (c.status === "PENDING" || c.status === "IN_PROGRESS") &&
                Date.now() - new Date(c.createdAt).getTime() > 5 * 24 * 60 * 60 * 1000
        );

    const rowBg = overall === "FAILED" ? "#fef2f2" : isOverdue ? "#fffbeb" : undefined;

    const handleAssign = (specialistId: string) => {
        startAssign(async () => {
            await assignSpecialistToRequest(requestId, specialistId);
        });
    };

    return (
        <>
            {/* ── Summary row ────────────────────────────────────────────── */}
            <tr
                style={{ background: rowBg, cursor: "pointer", userSelect: "none" }}
                onClick={onToggle}
            >
                {/* Chevron + candidate */}
                <td style={{ whiteSpace: "nowrap" }}>
                    <span
                        style={{
                            display: "inline-block",
                            marginRight: 8,
                            transition: "transform 0.15s",
                            transform: open ? "rotate(90deg)" : "rotate(0deg)",
                            color: "var(--text-light)",
                            fontSize: 11,
                        }}
                    >
                        ▶
                    </span>
                    <Link
                        href={`/requests/${requestId}`}
                        style={{ color: "var(--primary)", fontWeight: 600 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {candidateName}
                    </Link>
                    <div style={{ fontSize: 10, color: "var(--text-light)", marginLeft: 20 }}>
                        {candidateEmail}
                    </div>
                </td>

                {/* Partner + client */}
                <td onClick={(e) => e.stopPropagation()}>
                    <PartnerTag code={partnerCode} label={partnerCode} />
                    {clientName && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text-light)" }}>
                            {clientName}
                        </span>
                    )}
                </td>

                {/* Assign specialist dropdown */}
                <td onClick={(e) => e.stopPropagation()}>
                    {canActOnChecks ? (
                        <select
                            value={currentSpecialistId}
                            disabled={assigning}
                            onChange={(e) => handleAssign(e.target.value)}
                            style={{
                                fontSize: 12,
                                padding: "3px 6px",
                                border: "1px solid var(--border)",
                                borderRadius: 6,
                                background: assigning ? "#f1f5f9" : "#fff",
                                color: currentSpecialistId ? "#1d4ed8" : "var(--text-light)",
                                cursor: "pointer",
                                minWidth: 130,
                            }}
                        >
                            <option value="">— Unassigned —</option>
                            {specialists.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span style={{ fontSize: 12, color: currentSpecialistId ? "#1d4ed8" : "var(--text-light)" }}>
                            {currentSpecialistName ?? "Unassigned"}
                        </span>
                    )}
                </td>

                {/* Check summary pills */}
                <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {pending > 0 && <span style={pillStyle("#fef3c7", "#92400e")}>{pending} pending</span>}
                        {cleared > 0 && <span style={pillStyle("#dcfce7", "#166534")}>{cleared} cleared</span>}
                        {failed  > 0 && <span style={pillStyle("#fee2e2", "#991b1b")}>{failed} failed</span>}
                        <span style={pillStyle("#f1f5f9", "#475569")}>{total} total</span>
                    </div>
                </td>

                {/* Overall status */}
                <td onClick={(e) => e.stopPropagation()}>
                    <StatusBadge status={overall} />
                </td>

                {/* Expand hint */}
                <td style={{ color: "var(--text-light)", fontSize: 11, whiteSpace: "nowrap" }}>
                    {open ? "▲ Hide" : "▼ Checks"}
                </td>
            </tr>

            {/* ── Expanded checks sub-table ─────────────────────────────── */}
            {open && (
                <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={COLS} style={{ padding: "0 0 8px 40px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                    <th style={subTh}>Check Type</th>
                                    <th style={subTh}>Source</th>
                                    <th style={subTh}>Assigned To</th>
                                    <th style={subTh}>Status</th>
                                    <th style={subTh}>Completion Timestamp</th>
                                    <th style={subTh}>Remarks</th>
                                    {canActOnChecks && <th style={{ ...subTh, textAlign: "right" }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {checks.map((c) => (
                                    <tr
                                        key={c.id}
                                        style={{
                                            borderBottom: "1px solid var(--border)",
                                            background: c.status === "FAILED" ? "#fef2f2" : undefined,
                                        }}
                                    >
                                        <td style={subTd}><strong>{c.checkType}</strong></td>
                                        <td style={{ ...subTd, color: "var(--text-light)" }}>
                                            {c.requirementSource ?? "—"}
                                        </td>
                                        <td style={subTd}>
                                            {c.assignedTo ? (
                                                <span style={{
                                                    padding: "2px 8px", borderRadius: 10,
                                                    fontSize: 11, fontWeight: 500,
                                                    background: "#eff6ff", color: "#1d4ed8",
                                                }}>
                                                    {c.assignedTo}
                                                </span>
                                            ) : (
                                                <span style={{ color: "var(--text-light)" }}>—</span>
                                            )}
                                        </td>
                                        <td style={subTd}><StatusBadge status={c.status} /></td>
                                        <td style={subTd}>
                                            {c.completedAt ? (
                                                <span
                                                    style={{ fontSize: 11 }}
                                                    title={new Date(c.completedAt!).toISOString()}
                                                >
                                                    {localTimestamp(new Date(c.completedAt!))}
                                                </span>
                                            ) : (
                                                <span style={{ color: "var(--text-light)" }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ ...subTd, maxWidth: 200 }}>
                                            {c.remarks
                                                ? <span style={{ fontSize: 11 }}>{c.remarks}</span>
                                                : <span style={{ color: "var(--text-light)" }}>—</span>}
                                        </td>
                                        {canActOnChecks && (
                                            <td style={{ ...subTd, textAlign: "right" }}>
                                                <CheckActions
                                                    checkId={c.id}
                                                    checkType={c.checkType}
                                                    status={c.status}
                                                    candidateName={candidateName}
                                                    candidateEmail={candidateEmail}
                                                    canBlacklist
                                                />
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </td>
                </tr>
            )}
        </>
    );
}

function pillStyle(bg: string, color: string): React.CSSProperties {
    return {
        display: "inline-block", padding: "2px 7px",
        borderRadius: 10, fontSize: 10, fontWeight: 600,
        background: bg, color,
    };
}

const subTh: React.CSSProperties = {
    padding: "6px 10px", textAlign: "left",
    fontWeight: 600, fontSize: 11,
    color: "var(--text-light)", whiteSpace: "nowrap",
};

const subTd: React.CSSProperties = {
    padding: "7px 10px", verticalAlign: "middle",
};
