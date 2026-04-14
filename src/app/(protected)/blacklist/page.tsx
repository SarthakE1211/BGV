// src/app/(protected)/blacklist/page.tsx

import Link from "next/link";
import { requireAuth } from "@/src/lib/auth.helpers";
import { listBlacklist, PAGE_SIZE } from "@/src/lib/blacklist-registry";
import PartnerTag from "@/src/components/ui/PartnerTag";
import RequestsPagination from "@/src/components/requests/RequestsPagination";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}
function pick(sp: Record<string, string | string[] | undefined>, key: string) {
    const v = sp[key];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
}

export default async function BlacklistPage({ searchParams }: PageProps) {
    await requireAuth("SPECIALIST");
    const sp = await searchParams;
    const q = pick(sp, "q") ?? null;
    const page = Math.max(1, Number(pick(sp, "page") ?? 1) || 1);

    const { rows, total } = await listBlacklist(q, page);

    return (
        <>
            <form action="/blacklist" method="GET" className="search-bar">
                <input
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Check if candidate is blacklisted — enter name, email, or reason..."
                />
                <button className="btn btn-primary" type="submit">
                    Check Blacklist
                </button>
            </form>

            <div className="table-card">
                <div className="table-header">
                    <h3>Blacklisted Candidates</h3>
                </div>
                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Partner</th>
                                <th>Client</th>
                                <th>Failed Check</th>
                                <th>Reason</th>
                                <th>Date</th>
                                <th>Blacklisted By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        style={{
                                            textAlign: "center",
                                            padding: "40px 20px",
                                            color: "var(--text-light)",
                                        }}
                                    >
                                        No blacklisted candidates.
                                    </td>
                                </tr>
                            )}
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        <Link
                                            href={`/requests/${r.bgvRequestId}`}
                                            style={{ color: "var(--primary)" }}
                                        >
                                            <strong>{r.candidateName}</strong>
                                        </Link>
                                    </td>
                                    <td>{r.candidateEmail}</td>
                                    <td>
                                        {r.partnerCode ? (
                                            <PartnerTag code={r.partnerCode} />
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td>{r.clientName ?? "—"}</td>
                                    <td>{r.failedCheck}</td>
                                    <td
                                        style={{
                                            maxWidth: 320,
                                            fontSize: 11,
                                            color: "var(--danger)",
                                        }}
                                    >
                                        {r.reason}
                                    </td>
                                    <td style={{ color: "var(--text-light)" }}>
                                        {new Date(r.createdAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "2-digit",
                                            year: "numeric",
                                        })}
                                    </td>
                                    <td>{r.blacklistedBy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <RequestsPagination page={page} total={total} pageSize={PAGE_SIZE} />

            <div className="info-box info-red" style={{ marginTop: 14 }}>
                <strong>Automatic Blacklist Check:</strong> Every new BGV request is
                cross-checked against this registry. If a match is found, the SDM
                receives an immediate alert and the request is flagged. Blacklisted
                candidates cannot proceed through the BGV process.
            </div>
        </>
    );
}
