// src/components/dashboard/BGVDetailModal.tsx
// Client component — fetches and displays the full BGV detail in a modal.
// Opened from the dashboard "View" button; Pass/Fail actions refresh the data in-place.

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/src/components/ui/Modal";
import StatusBadge from "@/src/components/ui/StatusBadge";
import PartnerTag from "@/src/components/ui/PartnerTag";
import RoleChip from "@/src/components/ui/RoleChip";
import RegionBadge from "@/src/components/ui/RegionBadge";
import VendorTag from "@/src/components/ui/VendorTag";
import PassFailModal from "@/src/components/checks/PassFailModal";
import BlacklistModal from "@/src/components/checks/BlacklistModal";
import EmailSDMButton from "@/src/components/ui/EmailSDMButton";
import InitiateButton from "@/src/components/requests/InitiateButton";
import { fmtDateTime } from "@/src/lib/format";
import type { RequestDetailRow, CheckDetailRow, ActivityLogEntry } from "@/src/lib/request-detail";
import type { CheckStatus } from "@/src/lib/enums";

import type { UserRole } from "@/src/lib/enums";

interface Props {
    requestId: string | null;
    onClose: () => void;
    viewerRole: UserRole;
}

interface DetailData {
    request: RequestDetailRow;
    checks: CheckDetailRow[];
    activity: ActivityLogEntry[];
}

// ── Inline check-action row (owns its own pass/fail modal state) ────────────

interface CheckRowProps {
    check: CheckDetailRow;
    candidateName: string;
    candidateEmail: string;
    canAct: boolean;
    canBlacklist: boolean;
    onDone: () => void;
}

function CheckRow({ check, candidateName, candidateEmail, canAct, canBlacklist, onDone }: CheckRowProps) {
    const [pfMode, setPfMode] = useState<"pass" | "fail" | null>(null);
    const [blOpen, setBlOpen] = useState(false);

    const isOpen = check.status === "PENDING" || check.status === "IN_PROGRESS";
    const isFailed = check.status === "FAILED";

    const statusCls =
        check.status === "CLEARED"
            ? "done"
            : check.status === "FAILED"
                ? "failed"
                : "";

    return (
        <>
            <div className={`check-item ${statusCls}`}>
                <div className="check-name">
                    {check.checkType}
                    {check.requirementSource && (
                        <span style={{ color: "var(--text-light)", fontWeight: 400 }}>
                            {" "}— {check.requirementSource}
                        </span>
                    )}
                    {check.remarks && (
                        <div style={{ fontSize: 11, color: "var(--text-light)", marginTop: 2 }}>
                            {check.remarks}
                        </div>
                    )}
                </div>

                <StatusBadge status={check.status as CheckStatus} />

                {check.completedAt && (
                    <div className="check-time">{fmtDateTime(check.completedAt)}</div>
                )}

                {canAct && (
                    <div className="check-actions">
                        {isOpen && (
                            <>
                                <button className="btn btn-sm btn-success" onClick={() => setPfMode("pass")}>
                                    Pass
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => setPfMode("fail")}>
                                    Fail
                                </button>
                            </>
                        )}
                        {isFailed && canBlacklist && (
                            <button className="btn btn-sm btn-danger" onClick={() => setBlOpen(true)}>
                                Blacklist
                            </button>
                        )}
                    </div>
                )}
            </div>

            <PassFailModal
                open={pfMode !== null}
                mode={pfMode}
                checkId={check.id}
                checkType={check.checkType}
                onClose={() => setPfMode(null)}
                onDone={() => { setPfMode(null); onDone(); }}
            />
            <BlacklistModal
                open={blOpen}
                checkId={check.id}
                candidateName={candidateName}
                candidateEmail={candidateEmail}
                failedCheck={check.checkType}
                onClose={() => setBlOpen(false)}
            />
        </>
    );
}

// ── Action-label helper ─────────────────────────────────────────────────────

function actionLabel(action: string) {
    return action
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

const ACTION_VARIANT: Record<string, "completed" | "failed" | "default"> = {
    CHECK_CLEARED: "completed",
    CHECK_FAILED: "failed",
    BLACKLISTED: "failed",
    REQUEST_APPROVED: "completed",
};

// ── Main modal ──────────────────────────────────────────────────────────────

export default function BGVDetailModal({ requestId, onClose, viewerRole }: Props) {
    const [data, setData] = useState<DetailData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!requestId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/requests/${requestId}`);
            if (!res.ok) throw new Error("Failed to load request detail.");
            const json = await res.json();
            setData(json);
        } catch {
            setError("Could not load request details. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [requestId]);

    useEffect(() => {
        if (requestId) {
            setData(null);
            fetchData();
        }
    }, [requestId, fetchData]);

    const canAct = viewerRole === "SPECIALIST" || viewerRole === "HR_HEAD";
    const canBlacklist = viewerRole === "SPECIALIST" || viewerRole === "HR_HEAD";

    const title = data
        ? `BGV Detail — ${data.request.candidate.name}`
        : "BGV Detail";

    return (
        <Modal
            open={!!requestId}
            onClose={onClose}
            title={title}
            maxWidth={720}
            footer={
                data ? (() => {
                    const noActionYet = data.checks.every((c) => c.status === "PENDING");
                    const showInitiate =
                        canAct &&
                        data.request.status === "PENDING" &&
                        noActionYet;
                    return (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                            <span style={{ fontSize: 11, color: "var(--text-light)" }}>
                                {data.request.requestNumber}
                            </span>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {showInitiate && (
                                    <InitiateButton
                                        requestId={data.request.id}
                                        size="sm"
                                        onDone={fetchData}
                                    />
                                )}
                                <Link
                                    href={`/requests/${data.request.id}`}
                                    className="btn btn-outline btn-sm"
                                    onClick={onClose}
                                >
                                    View Full Detail →
                                </Link>
                                <EmailSDMButton requestId={data.request.id} />
                            </div>
                        </div>
                    );
                })() : undefined
            }
        >
            {loading && (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-light)", fontSize: 13 }}>
                    Loading…
                </div>
            )}

            {error && (
                <div className="info-box info-red" style={{ margin: 0 }}>
                    {error}
                </div>
            )}

            {data && !loading && (() => {
                const { request, checks, activity } = data;
                const cleared = checks.filter((c) => c.status === "CLEARED").length;

                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {/* ── Info grid ─────────────────────────────────── */}
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
                                <strong>Submitted:</strong> {fmtDateTime(request.createdAt)}
                            </div>
                            <div>
                                <strong>Status:</strong> <StatusBadge status={request.status} />
                            </div>
                            <div>
                                <strong>BGV Type:</strong> {request.bgvType}
                            </div>
                        </div>

                        {request.notes && (
                            <div className="info-box info-blue" style={{ margin: 0 }}>
                                <strong>Notes:</strong> {request.notes}
                            </div>
                        )}

                        {/* ── Verification checks ───────────────────────── */}
                        <div>
                            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                                Verification Checks ({cleared}/{checks.length} completed)
                            </h4>

                            {checks.length === 0 ? (
                                <div className="info-box info-amber" style={{ margin: 0 }}>
                                    No checks were generated for this request.
                                </div>
                            ) : (
                                checks.map((c) => (
                                    <CheckRow
                                        key={c.id}
                                        check={c}
                                        candidateName={request.candidate.name}
                                        candidateEmail={request.candidate.email}
                                        canAct={canAct}
                                        canBlacklist={canBlacklist}
                                        onDone={fetchData}
                                    />
                                ))
                            )}
                        </div>

                        {/* ── Activity timeline ─────────────────────────── */}
                        <div>
                            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                                Activity Timeline
                            </h4>

                            <div className="timeline">
                                {activity.length === 0 ? (
                                    <div style={{ fontSize: 12, color: "var(--text-light)" }}>
                                        No activity recorded yet.
                                    </div>
                                ) : (
                                    activity.map((a) => {
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
                                                    {fmtDateTime(a.createdAt)} — {a.performedBy}
                                                </div>
                                                <div className="tl-text">
                                                    <strong>{actionLabel(a.action)}</strong>
                                                    {a.details ? ` — ${a.details}` : ""}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </Modal>
    );
}
