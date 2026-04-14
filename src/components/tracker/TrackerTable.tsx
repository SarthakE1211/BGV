// src/components/tracker/TrackerTable.tsx
//
// Server-rendered tracker table with inline Pass/Fail/Blacklist actions.
// Filters are slotted into the table-card header by the page.

import Link from "next/link";
import StatusBadge from "@/src/components/ui/StatusBadge";
import PartnerTag from "@/src/components/ui/PartnerTag";
import CheckActions from "@/src/components/checks/CheckActions";
import type { TrackerRow } from "@/src/lib/tracker";
import type { UserRole } from "@/src/lib/enums";

interface Props {
    rows: TrackerRow[];
    filtersSlot: React.ReactNode;
    viewerRole: UserRole;
}

export default function TrackerTable({ rows, filtersSlot, viewerRole }: Props) {
    const canActOnChecks = viewerRole === "SPECIALIST" || viewerRole === "HR_HEAD";

    return (
        <div className="table-card">
            <div className="table-header">
                <h3>Individual Check Tracker</h3>
                {filtersSlot}
            </div>
            <div className="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Technician</th>
                            <th>Partner / Account</th>
                            <th>Check Type</th>
                            <th>Requirement Source</th>
                            <th>Assigned To</th>
                            <th>Status</th>
                            <th>Completion</th>
                            <th>Remarks</th>
                            {canActOnChecks && <th style={{ textAlign: "right" }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={canActOnChecks ? 9 : 8}
                                    style={{
                                        textAlign: "center",
                                        padding: "40px 20px",
                                        color: "var(--text-light)",
                                    }}
                                >
                                    No checks match the current filters.
                                </td>
                            </tr>
                        )}
                        {rows.map((r) => {
                            const isFailed = r.status === "FAILED";
                            const isOverdue =
                                !isFailed &&
                                (r.status === "PENDING" || r.status === "IN_PROGRESS") &&
                                Date.now() - new Date(r.createdAt).getTime() >
                                    5 * 24 * 60 * 60 * 1000;
                            const rowBg = isFailed
                                ? "#fef2f2"
                                : isOverdue
                                  ? "#fffbeb"
                                  : undefined;
                            return (
                            <tr key={r.id} style={rowBg ? { background: rowBg } : undefined}>
                                <td>
                                    <Link
                                        href={`/requests/${r.requestId}`}
                                        style={{ color: "var(--primary)", fontWeight: 600 }}
                                    >
                                        {r.candidateName}
                                    </Link>
                                    <div style={{ fontSize: 10, color: "var(--text-light)" }}>
                                        {r.candidateEmail}
                                    </div>
                                </td>
                                <td>
                                    <PartnerTag code={r.partnerCode} label={r.partnerCode} />
                                    {r.clientName && (
                                        <span style={{ marginLeft: 6, color: "var(--text-light)" }}>
                                            {r.clientName}
                                        </span>
                                    )}
                                </td>
                                <td>{r.checkType}</td>
                                <td style={{ color: "var(--text-light)" }}>
                                    {r.requirementSource ?? "—"}
                                </td>
                                <td>{r.assignedTo ?? "—"}</td>
                                <td>
                                    <StatusBadge status={r.status} />
                                </td>
                                <td style={{ color: "var(--text-light)" }}>
                                    {r.completedAt
                                        ? new Date(r.completedAt).toLocaleString("en-US", {
                                                month: "short",
                                                day: "2-digit",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })
                                        : "—"}
                                </td>
                                <td style={{ maxWidth: 220 }}>
                                    {r.remarks ? (
                                        <span style={{ fontSize: 11 }}>{r.remarks}</span>
                                    ) : (
                                        <span style={{ color: "var(--text-light)" }}>—</span>
                                    )}
                                </td>
                                {canActOnChecks && (
                                    <td style={{ textAlign: "right" }}>
                                        <CheckActions
                                            checkId={r.id}
                                            checkType={r.checkType}
                                            status={r.status}
                                            candidateName={r.candidateName}
                                            candidateEmail={r.candidateEmail}
                                            canBlacklist
                                        />
                                    </td>
                                )}
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
