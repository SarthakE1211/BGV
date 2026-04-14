// src/components/dashboard/PartnerBreakdown.tsx
//
// Small stat-grid row showing per-partner request counts, each card
// colored by the partner's brand accent (matches prototype).

export interface PartnerBreakdownRow {
    code: string;
    name: string;
    total: number;
    fte: number;
    pro: number;
    dispatch: number;
    backfill: number;
}

const ACCENT: Record<string, string> = {
    HCL: "#3b82f6",
    COG: "#7c3aed",
    LTM: "#0891b2",
    TCS: "#ea580c",
    WIP: "#db2777",
    HEX: "#059669",
    BIR: "#ca8a04",
    MIN: "#4f46e5",
};

export default function PartnerBreakdown({ rows }: { rows: PartnerBreakdownRow[] }) {
    if (!rows.length) return null;
    return (
        <div
            className="stats-grid"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
        >
            {rows.map((r) => {
                const sub = [
                    r.fte && `FTE: ${r.fte}`,
                    r.pro && `PRO: ${r.pro}`,
                    r.dispatch && `Dispatch: ${r.dispatch}`,
                    r.backfill && `Backfill: ${r.backfill}`,
                ]
                    .filter(Boolean)
                    .join(" · ");
                return (
                    <div
                        key={r.code}
                        className="stat-card"
                        style={{ borderLeft: `3px solid ${ACCENT[r.code] ?? "#64748b"}` }}
                    >
                        <div className="stat-label">{r.name}</div>
                        <div className="stat-value" style={{ fontSize: 20 }}>
                            {r.total}
                        </div>
                        <div className="stat-sub">{sub || "—"}</div>
                    </div>
                );
            })}
        </div>
    );
}
