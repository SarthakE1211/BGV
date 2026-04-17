// src/components/partners/PartnersTabs.tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface Props {
    current: string;
    counts: {
        ALL: number;
        HCL: number;
        COG: number;
        LTM: number;
        TCS: number;
        WIP: number;
        OTHERS: number;
    };
}

const TABS: Array<{ id: string; label: string }> = [
    { id: "ALL", label: "All Partners" },
    { id: "HCL", label: "HCL Clients" },
    { id: "COG", label: "Cognizant Accounts" },
    { id: "LTM", label: "LTIMindtree" },
    { id: "TCS", label: "TCS" },
    { id: "WIP", label: "Wipro" },
    { id: "OTHERS", label: "Others" },
];

export default function PartnersTabs({ current, counts }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [, startTransition] = useTransition();

    const setTab = (id: string) => {
        const sp = new URLSearchParams(params.toString());
        if (id === "ALL") sp.delete("tab");
        else sp.set("tab", id);
        startTransition(() => {
            router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
        });
    };

    return (
        <div className="tab-bar">
            {TABS.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    className={`tab ${current === t.id ? "active" : ""}`}
                    onClick={() => setTab(t.id)}
                >
                    {t.label}
                    <span className="tab-count">
                        {counts[t.id as keyof typeof counts]}
                    </span>
                </button>
            ))}
        </div>
    );
}
