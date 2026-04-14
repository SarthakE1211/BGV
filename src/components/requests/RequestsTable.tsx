// src/components/requests/RequestsTable.tsx
//
// Server component: renders the .table-card with header (title + filters
// slot) and the actual table. Accepts the filters element as a prop so
// the server page can wire the client component in.

import Link from "next/link";
import StatusBadge from "@/src/components/ui/StatusBadge";
import PartnerTag from "@/src/components/ui/PartnerTag";
import RoleChip from "@/src/components/ui/RoleChip";
import VendorTag from "@/src/components/ui/VendorTag";
import RegionBadge from "@/src/components/ui/RegionBadge";
import type { RequestListRow } from "@/src/lib/requests";

interface Props {
    rows: RequestListRow[];
    page: number;
    pageSize: number;
    filtersSlot: React.ReactNode;
}

export default function RequestsTable({ rows, page, pageSize, filtersSlot }: Props) {
    return (
        <div className="table-card">
            <div className="table-header">
                <h3>BGV Requests Queue</h3>
                {filtersSlot}
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
                            <th>Initiation Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={11}
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
                                    <Link
                                        href={`/requests/${r.id}`}
                                        style={{ color: "var(--primary)" }}
                                    >
                                        <strong>{r.candidate.name}</strong>
                                    </Link>
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
                                <td>
                                    {r.initiationDate
                                        ? new Date(r.initiationDate).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "2-digit",
                                            })
                                        : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
