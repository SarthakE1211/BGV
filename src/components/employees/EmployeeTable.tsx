// src/components/employees/EmployeeTable.tsx

import Link from "next/link";
import StatusBadge from "@/src/components/ui/StatusBadge";
import PartnerTag from "@/src/components/ui/PartnerTag";
import RoleChip from "@/src/components/ui/RoleChip";
import RegionBadge from "@/src/components/ui/RegionBadge";
import {
    CHECK_CATEGORIES,
    type CheckCategory,
    type EmployeeRow,
} from "@/src/lib/employees";
import type { CheckStatus } from "@/src/lib/enums";

const CATEGORY_LABEL: Record<CheckCategory, string> = {
    CRIMINAL: "Criminal",
    EDUCATION: "Education",
    EMPLOYMENT: "Employment",
    DRUG: "Drug Test",
    CREDIT: "Credit",
    SSN: "SSN/Addr",
    OTHER: "Other",
};

// Map a CheckStatus to a mini-badge {cls, label} for the per-category columns.
function miniBadge(status: CheckStatus | null, fallbackLabel: string | null) {
    if (!status) return null;
    if (status === "CLEARED") return { cls: "status-green", label: "Clear" };
    if (status === "FAILED") return { cls: "status-failed", label: "FAIL" };
    if (status === "IN_PROGRESS") return { cls: "status-in-progress", label: fallbackLabel ?? "In Prog" };
    return { cls: "status-pending", label: fallbackLabel ?? "Pend" };
}

export default function EmployeeTable({ rows }: { rows: EmployeeRow[] }) {
    return (
        <div className="table-card">
            <div className="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Sr No</th>
                            <th>Technician Name</th>
                            <th>Partner</th>
                            <th>Client Account</th>
                            <th>Role</th>
                            <th>Region</th>
                            {CHECK_CATEGORIES.map((cat) => (
                                <th key={cat}>{CATEGORY_LABEL[cat]}</th>
                            ))}
                            <th>BGV Status</th>
                            <th>BGV Letter</th>
                            <th>Approval</th>
                            <th>Template</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6 + CHECK_CATEGORIES.length + 4}
                                    style={{
                                        textAlign: "center",
                                        padding: "40px 20px",
                                        color: "var(--text-light)",
                                    }}
                                >
                                    No records match the current filters.
                                </td>
                            </tr>
                        )}
                        {rows.map((r, idx) => {
                            const canGenerate =
                                r.status === "GREEN" &&
                                r.approvedByName !== null &&
                                !r.letterIssuedDate;
                            return (
                                <tr key={r.requestId}>
                                    <td>{idx + 1}</td>
                                    <td>
                                        <Link
                                            href={`/requests/${r.requestId}`}
                                            style={{ color: "var(--primary)" }}
                                        >
                                            <strong>{r.candidateName}</strong>
                                        </Link>
                                        <div style={{ fontSize: 10, color: "var(--text-light)" }}>
                                            {r.candidateEmail}
                                        </div>
                                    </td>
                                    <td>
                                        <PartnerTag code={r.partnerCode} />
                                    </td>
                                    <td>{r.clientName ?? "—"}</td>
                                    <td>
                                        <RoleChip role={r.roleType} />
                                    </td>
                                    <td>
                                        <RegionBadge region={r.region} />
                                    </td>
                                    {CHECK_CATEGORIES.map((cat) => {
                                        const badge = miniBadge(
                                            r.checksByCategory[cat],
                                            cat === "OTHER" ? r.otherLabel : null
                                        );
                                        return (
                                            <td key={cat}>
                                                {badge ? (
                                                    <span
                                                        className={`status-badge ${badge.cls}`}
                                                        style={{ fontSize: 9 }}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "var(--text-light)" }}>
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td>
                                        <StatusBadge status={r.status} />
                                    </td>
                                    <td>
                                        {r.letterIssuedDate
                                            ? new Date(r.letterIssuedDate).toLocaleDateString(
                                                    "en-US",
                                                    { month: "short", day: "2-digit" }
                                                )
                                            : "—"}
                                    </td>
                                    <td>
                                        {r.approvedByName ?? (
                                            <span style={{ color: "var(--text-light)" }}>
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {canGenerate ? (
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-accent"
                                                disabled
                                                title="Letter generation — coming soon"
                                            >
                                                Generate
                                            </button>
                                        ) : r.letterIssuedDate ? (
                                            <span style={{ color: "var(--success)", fontSize: 11 }}>
                                                Issued
                                            </span>
                                        ) : (
                                            <span style={{ color: "var(--text-light)" }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
