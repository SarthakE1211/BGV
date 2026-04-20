// src/app/(protected)/partners/page.tsx

import { requireAuth } from "@/src/lib/auth.helpers";
import { getPartnersConfig, type PartnerConfigRow } from "@/src/lib/partners-config";
import PartnersTabs from "@/src/components/partners/PartnersTabs";
import PartnerChecksEditor from "@/src/components/partners/PartnerChecksEditor";

export const dynamic = "force-dynamic";

// Partner-brand colors for card left-border, matching the prototype.
const PARTNER_COLOR: Record<string, string> = {
    HCL: "#3b82f6",
    COG: "#7c3aed",
    LTM: "#0891b2",
    TCS: "#ea580c",
    WIP: "#db2777",
    HEX: "#059669",
    BIR: "#ca8a04",
    MIN: "#4f46e5",
};

const MAIN_TAB_CODES = ["HCL", "COG", "LTM", "TCS", "WIP"] as const;

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}
function pick(sp: Record<string, string | string[] | undefined>, key: string) {
    const v = sp[key];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
}

export default async function PartnersPage({ searchParams }: PageProps) {
    const user = await requireAuth("HR_HEAD");
    const sp = await searchParams;
    const tabParam = (pick(sp, "tab") ?? "ALL").toUpperCase();

    const all = await getPartnersConfig(user.id);

    const mainCodes = new Set<string>(MAIN_TAB_CODES as readonly string[]);
    const visible =
        tabParam === "ALL"
            ? all
            : tabParam === "OTHERS"
              ? all.filter((p) => !mainCodes.has(p.code))
              : all.filter((p) => p.code === tabParam);

    const totalCards = all.reduce((n, p) => n + 1 + p.clients.length, 0);

    const tabCounts = {
        ALL: totalCards,
        HCL: countCards(all, "HCL"),
        COG: countCards(all, "COG"),
        LTM: countCards(all, "LTM"),
        TCS: countCards(all, "TCS"),
        WIP: countCards(all, "WIP"),
        OTHERS: all
            .filter((p) => !mainCodes.has(p.code))
            .reduce((n, p) => n + 1 + p.clients.length, 0),
    };

    return (
        <>
            <PartnersTabs current={tabParam} counts={tabCounts} />

            <div className="info-box info-amber" style={{ marginBottom: 14 }}>
                <strong>Check Determination Logic:</strong> When an SDM submits a
                request, the system auto-loads the standard checks for the selected
                partner. If a specific end client is selected, custom/additional checks
                per the client SOW are added automatically. Specialists can further
                customize if needed.
            </div>

            <div className="partner-cards">
                {visible.length === 0 && (
                    <div
                        style={{
                            gridColumn: "1 / -1",
                            padding: 24,
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            fontSize: 12,
                            color: "var(--text-light)",
                        }}
                    >
                        No partners configured for this tab.
                    </div>
                )}

                {visible.flatMap((p) => {
                    const accent = PARTNER_COLOR[p.code] ?? "#64748b";
                    const borderLeft = `4px solid ${accent}`;
                    const cards: React.ReactNode[] = [];

                    // Standard card
                    cards.push(
                        <div
                            key={`${p.id}-std`}
                            className="partner-card"
                            style={{ borderLeft }}
                        >
                            <h4 style={{ color: accent }}>
                                {p.name} — Standard (MSA Default)
                            </h4>
                            <div className="subtitle">
                                Applied to most {p.name} clients unless SOW specifies otherwise
                            </div>
                            <div>
                                {p.standardChecks.length === 0 && (
                                    <span style={{ fontSize: 11, color: "var(--text-light)" }}>
                                        No standard checks configured
                                    </span>
                                )}
                                {p.standardChecks.map((c) => (
                                    <span key={c} className="check-tag">
                                        {c}
                                    </span>
                                ))}
                            </div>
                            <PartnerChecksEditor
                                partnerId={p.id}
                                partnerName={p.name}
                                initialChecks={p.standardChecks}
                            />
                        </div>
                    );

                    // One card per client
                    for (const c of p.clients) {
                        cards.push(
                            <div
                                key={c.id}
                                className="partner-card"
                                style={{ borderLeft }}
                            >
                                <h4 style={{ color: accent }}>
                                    {p.name} — {c.clientName}
                                </h4>
                                <div className="subtitle">
                                    {c.specialNotes ?? "Client-specific check matrix"}
                                </div>

                                {c.usaChecks.length > 0 && (
                                    <div className="client-block">
                                        <strong>USA:</strong>
                                        <div className="checks">{c.usaChecks.join(", ")}</div>
                                    </div>
                                )}
                                {c.canadaChecks.length > 0 && (
                                    <div className="client-block">
                                        <strong>Canada:</strong>
                                        <div className="checks">
                                            {c.canadaChecks.join(", ")}
                                        </div>
                                    </div>
                                )}
                                {c.latamChecks.length > 0 && (
                                    <div className="client-block">
                                        <strong>LATAM:</strong>
                                        <div className="checks">{c.latamChecks.join(", ")}</div>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return cards;
                })}
            </div>
        </>
    );
}

function countCards(all: PartnerConfigRow[], code: string) {
    const p = all.find((x) => x.code === code);
    if (!p) return 0;
    return 1 + p.clients.length;
}
