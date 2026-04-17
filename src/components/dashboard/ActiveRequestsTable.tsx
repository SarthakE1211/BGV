// src/components/dashboard/ActiveRequestsTable.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import StatusBadge from "@/src/components/ui/StatusBadge";
import PartnerTag from "@/src/components/ui/PartnerTag";
import RoleChip from "@/src/components/ui/RoleChip";
import RegionBadge from "@/src/components/ui/RegionBadge";
import VendorTag from "@/src/components/ui/VendorTag";
import BGVDetailModal from "@/src/components/dashboard/BGVDetailModal";
import { fmtDateTime } from "@/src/lib/format";
import type { ActiveRequestRow } from "@/src/lib/dashboard";
import type { BGVStatus, BGVVendor, UserRole } from "@/src/lib/enums";

export default function ActiveRequestsTable({ rows, viewerRole }: { rows: ActiveRequestRow[]; viewerRole: UserRole }) {
    const [partner, setPartner] = useState<string>("");
    const [status, setStatus] = useState<string>("");
    const [vendor, setVendor] = useState<string>("");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const partners = useMemo(() => {
        const seen = new Map<string, string>();
        rows.forEach((r) => {
            if (!seen.has(r.partner.code)) seen.set(r.partner.code, r.partner.name);
        });
        return Array.from(seen, ([code, name]) => ({ code, name }));
    }, [rows]);

    const filtered = useMemo(
        () =>
            rows.filter((r) => {
                if (partner && r.partner.code !== partner) return false;
                if (status && r.status !== (status as BGVStatus)) return false;
                if (vendor && r.bgvVendor !== (vendor as BGVVendor)) return false;
                return true;
            }),
        [rows, partner, status, vendor]
    );

    return (
        <>
        <BGVDetailModal requestId={selectedId} onClose={() => setSelectedId(null)} viewerRole={viewerRole} />
        <div className="table-card">
            <div className="table-header">
                <h3>Recent BGV Activity</h3>
                <div className="table-filters">
                    <select
                        className="filter-input"
                        value={partner}
                        onChange={(e) => setPartner(e.target.value)}
                    >
                        <option value="">All Partners</option>
                        {partners.map((p) => (
                            <option key={p.code} value={p.code}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                    <select
                        className="filter-input"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="AMBER">Amber</option>
                        <option value="GREEN">Green</option>
                        <option value="RED_FLAG">Red Flag</option>
                    </select>
                    <select
                        className="filter-input"
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                    >
                        <option value="">All Vendors</option>
                        <option value="DISA">DISA</option>
                        <option value="PRECISEHIRE">PreciseHire</option>
                    </select>
                    <Link href="/requests" className="btn btn-outline btn-sm">
                        View all →
                    </Link>
                </div>
            </div>

            <div className="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Technician</th>
                            <th>Partner</th>
                            <th>Client Account</th>
                            <th>Role</th>
                            <th>Region</th>
                            <th>BGV Vendor</th>
                            <th>Checks Progress</th>
                            <th>BGV Status</th>
                            <th>Initiated</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td
                                    colSpan={10}
                                    style={{
                                        textAlign: "center",
                                        padding: "40px 20px",
                                        color: "var(--text-light)",
                                    }}
                                >
                                    {rows.length === 0
                                        ? "No active requests. Submit a new BGV request to get started."
                                        : "No requests match the current filters."}
                                </td>
                            </tr>
                        )}
                        {filtered.map((r) => (
                            <tr key={r.id}>
                                <td>
                                    <strong>{r.candidate.name}</strong>
                                    <br />
                                    <span style={{ fontSize: 10, color: "var(--text-light)" }}>
                                        {r.candidate.email}
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
                                <td>
                                    {r.checksCleared}/{r.checksTotal} checks
                                </td>
                                <td>
                                    <StatusBadge status={r.status} />
                                </td>
                                <td>
                                    {(() => {
                                        const d = r.initiationDate ?? r.createdAt;
                                        const label = fmtDateTime(d);
                                        // When the BGV hasn't been initiated yet, the date
                                        // shown is the submission date — indicate that softly.
                                        return r.initiationDate ? (
                                            label
                                        ) : (
                                            <span
                                                style={{ color: "var(--text-light)" }}
                                                title="Submitted — not yet initiated"
                                            >
                                                {label}
                                            </span>
                                        );
                                    })()}
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
