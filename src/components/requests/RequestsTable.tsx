// src/components/requests/RequestsTable.tsx
"use client";

import { useState } from "react";
import StatusBadge from "@/src/components/ui/StatusBadge";
import PartnerTag from "@/src/components/ui/PartnerTag";
import RoleChip from "@/src/components/ui/RoleChip";
import VendorTag from "@/src/components/ui/VendorTag";
import RegionBadge from "@/src/components/ui/RegionBadge";
import BGVDetailModal from "@/src/components/dashboard/BGVDetailModal";
import RequestsFilters from "@/src/components/requests/RequestsFilters";
import InitiateButton from "@/src/components/requests/InitiateButton";
import { fmtDateTime } from "@/src/lib/format";
import type { RequestListRow } from "@/src/lib/requests";
import type { UserRole } from "@/src/lib/enums";

interface Props {
    rows: RequestListRow[];
    page: number;
    pageSize: number;
    partners: Array<{ code: string; name: string }>;
    sdms: Array<{ id: string; name: string }>;
    viewerRole: UserRole;
}


export default function RequestsTable({
    rows,
    page,
    pageSize,
    partners,
    sdms,
    viewerRole,
}: Props) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const canInitiate = viewerRole === "SPECIALIST" || viewerRole === "HR_HEAD";

    return (
        <>
            <BGVDetailModal
                requestId={selectedId}
                onClose={() => setSelectedId(null)}
                viewerRole={viewerRole}
            />
            <div className="table-card">
                <div className="table-header">
                    <h3>BGV Requests Queue</h3>
                    <RequestsFilters
                        partners={partners}
                        sdms={sdms}
                        role={viewerRole}
                    />
                </div>
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
                                <th>BGV Vendor</th>
                                <th>BGV Type</th>
                                <th>Requested By</th>
                                <th>BGV Status</th>
                                <th>Created Date</th>
                                <th>Initiation Date</th>
                                <th>Initiate</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={14}
                                        style={{
                                            textAlign: "center",
                                            padding: "40px 20px",
                                            color: "var(--text-light)",
                                        }}
                                    >
                                        No requests match the current filters.
                                    </td>
                                </tr>
                            )}
                            {rows.map((r, idx) => (
                                <tr key={r.id}>
                                    <td>{(page - 1) * pageSize + idx + 1}</td>
                                    <td>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(r.id)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                padding: 0,
                                                textAlign: "left",
                                                color: "var(--primary)",
                                                cursor: "pointer",
                                                font: "inherit",
                                            }}
                                        >
                                            <strong>{r.candidate.name}</strong>
                                        </button>
                                        <br />
                                        <span style={{ fontSize: 10, color: "var(--text-light)" }}>
                                            {r.requestNumber} · {r.candidate.email}
                                        </span>
                                    </td>
                                    <td>
                                        <PartnerTag code={r.partner.code} label={r.partner.name} />
                                    </td>
                                    <td>{r.clientName ?? "—"}</td>
                                    <td>
                                        <RoleChip role={r.roleType} />
                                    </td>
                                    <td>
                                        <RegionBadge region={r.region} />
                                    </td>
                                    <td>
                                        <VendorTag vendor={r.bgvVendor} />
                                    </td>
                                    <td>{r.bgvType}</td>
                                    <td>{r.submittedBy}</td>
                                    <td>
                                        <StatusBadge status={r.status} />
                                    </td>
                                    <td>{fmtDateTime(r.createdAt)}</td>
                                    <td>
                                        {r.initiationDate ? (
                                            fmtDateTime(r.initiationDate)
                                        ) : (
                                            <span
                                                style={{ color: "var(--text-light)" }}
                                                title="Not yet initiated"
                                            >
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {r.status === "PENDING" && canInitiate ? (
                                            <InitiateButton requestId={r.id} size="sm" />
                                        ) : (
                                            <span style={{ color: "var(--text-light)" }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={() => setSelectedId(r.id)}
                                        >
                                            View
                                        </button>
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
