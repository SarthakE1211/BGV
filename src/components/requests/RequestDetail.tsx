// src/components/requests/RequestDetail.tsx
//
// Server component: renders the prototype "View BGV Detail" layout as a
// full page — info grid, verification checks list, and activity timeline.

import StatusBadge from "@/src/components/ui/StatusBadge";
import PartnerTag from "@/src/components/ui/PartnerTag";
import RoleChip from "@/src/components/ui/RoleChip";
import RegionBadge from "@/src/components/ui/RegionBadge";
import VendorTag from "@/src/components/ui/VendorTag";
import CheckActions from "@/src/components/checks/CheckActions";
import type {
    RequestDetailRow,
    CheckDetailRow,
    ActivityLogEntry,
} from "@/src/lib/request-detail";
import type { UserRole } from "@/src/lib/enums";

interface Props {
    request: RequestDetailRow;
    checks: CheckDetailRow[];
    activity: ActivityLogEntry[];
    viewerRole: UserRole;
}

const ACTION_VARIANT: Record<string, "completed" | "failed" | "default"> = {
    CHECK_CLEARED: "completed",
    CHECK_FAILED: "failed",
    BLACKLISTED: "failed",
    REQUEST_APPROVED: "completed",
};

export default function RequestDetail({ request, checks, activity, viewerRole }: Props) {
    const cleared = checks.filter((c) => c.status === "CLEARED").length;
    const total = checks.length;
    const canActOnChecks = viewerRole === "SPECIALIST" || viewerRole === "HR_HEAD";
    const canBlacklist = viewerRole === "SPECIALIST" || viewerRole === "HR_HEAD";

    return (
        <div className="table-card" style={{ padding: 22 }}>
            {/* Header */}
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "var(--text-light)" }}>
                    {request.requestNumber}
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                    BGV Detail — {request.candidate.name}
                </h2>
                <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}>
                    {request.candidate.email}
                    {request.candidate.phone && ` · ${request.candidate.phone}`}
                </div>
            </div>

            {/* Info grid (3 cols — matches prototype) */}
            <div className="info-grid">
                <div>
                    <strong>Partner:</strong>{" "}
                    <PartnerTag code={request.partner.code} label={request.partner.name} />
                </div>
                <div>
                    <strong>Client:</strong> {request.client?.name ?? "—"}
                </div>
                <div>
                    <strong>Role:</strong> <RoleChip role={request.roleType} />
                </div>
                <div>
                    <strong>Region:</strong> <RegionBadge region={request.region} />
                </div>
                <div>
                    <strong>SDM:</strong> {request.submittedBy.name}
                </div>
                <div>
                    <strong>BGV Vendor:</strong> <VendorTag vendor={request.bgvVendor} />
                </div>
                <div>
                    <strong>Submitted:</strong>{" "}
                    {new Date(request.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                    })}
                </div>
                <div>
                    <strong>Status:</strong> <StatusBadge status={request.status} />
                </div>
                <div>
                    <strong>BGV Type:</strong> {request.bgvType}
                </div>
            </div>

            {request.notes && (
                <div className="info-box info-blue" style={{ marginBottom: 14 }}>
                    <strong>Notes:</strong> {request.notes}
                </div>
            )}

            {/* Verification checks */}
            <h4 style={{ fontSize: 13, margin: "8px 0 8px" }}>
                Verification Checks ({cleared}/{total} completed)
            </h4>

            {checks.length === 0 && (
                <div className="info-box info-amber">
                    No checks were generated for this request. Check the partner/client
                    matrix configuration.
                </div>
            )}

            {checks.map((c) => {
                const cls =
                    c.status === "CLEARED"
                        ? "done"
                        : c.status === "FAILED"
                          ? "failed"
                          : "";
                return (
                    <div key={c.id} className={`check-item ${cls}`}>
                        <div className="check-name">
                            {c.checkType}
                            {c.requirementSource && (
                                <span style={{ color: "var(--text-light)", fontWeight: 400 }}>
                                    {" "}— {c.requirementSource}
                                </span>
                            )}
                            {c.remarks && (
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--text-light)",
                                        marginTop: 2,
                                    }}
                                >
                                    {c.remarks}
                                </div>
                            )}
                        </div>
                        <StatusBadge status={c.status} />
                        {c.completedAt && (
                            <div className="check-time">
                                {new Date(c.completedAt).toLocaleString("en-US", {
                                    month: "short",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </div>
                        )}
                        {canActOnChecks && (
                            <CheckActions
                                checkId={c.id}
                                checkType={c.checkType}
                                status={c.status}
                                candidateName={request.candidate.name}
                                candidateEmail={request.candidate.email}
                                canBlacklist={canBlacklist}
                            />
                        )}
                    </div>
                );
            })}

            {/* Activity timeline */}
            <h4 style={{ fontSize: 13, margin: "20px 0 6px" }}>Activity Timeline</h4>
            <div className="timeline">
                {activity.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-light)" }}>
                        No activity recorded yet.
                    </div>
                )}
                {activity.map((a) => {
                    const variant = ACTION_VARIANT[a.action] ?? "default";
                    const cls =
                        variant === "completed"
                            ? "completed"
                            : variant === "failed"
                              ? "failed"
                              : "";
                    return (
                        <div key={a.id} className={`timeline-item ${cls}`}>
                            <div className="tl-time">
                                {new Date(a.createdAt).toLocaleString("en-US", {
                                    month: "short",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}{" "}
                                — {a.performedBy}
                            </div>
                            <div className="tl-text">
                                <strong>{actionLabel(a.action)}</strong>
                                {a.details ? ` — ${a.details}` : ""}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function actionLabel(action: string) {
    return action
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}
