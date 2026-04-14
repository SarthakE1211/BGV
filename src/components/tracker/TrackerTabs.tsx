// src/components/tracker/TrackerTabs.tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { CheckTab, CheckTabCounts } from "@/src/lib/tracker";

// Label + order inlined here so the client bundle does not reach into
// src/lib/tracker.ts (which imports mysql2 via db.ts).
const TABS: Array<{ id: CheckTab; label: string }> = [
    { id: "all", label: "All Active Checks" },
    { id: "criminal", label: "Criminal" },
    { id: "education", label: "Education" },
    { id: "employment", label: "Employment" },
    { id: "drug", label: "Drug Test" },
    { id: "ssn", label: "SSN/Address" },
    { id: "credit", label: "Credit" },
    { id: "specialized", label: "Specialized" },
];

export default function TrackerTabs({ counts }: { counts: CheckTabCounts }) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [, startTransition] = useTransition();

    const current = (params.get("tab") ?? "all") as CheckTab;

    const setTab = (t: CheckTab) => {
        const sp = new URLSearchParams(params.toString());
        if (t === "all") sp.delete("tab");
        else sp.set("tab", t);
        sp.delete("page");
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
                    <span className="tab-count">{counts[t.id]}</span>
                </button>
            ))}
        </div>
    );
}
