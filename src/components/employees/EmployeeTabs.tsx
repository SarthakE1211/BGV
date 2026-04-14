// src/components/employees/EmployeeTabs.tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { EmployeeTab, EmployeeTabCounts } from "@/src/lib/employees";

const TABS: Array<{ id: EmployeeTab; label: string }> = [
    { id: "all", label: "All Records" },
    { id: "green", label: "Green" },
    { id: "amber", label: "Amber" },
    { id: "red", label: "Red Flag" },
    { id: "blacklisted", label: "Blacklisted" },
];

export default function EmployeeTabs({ counts }: { counts: EmployeeTabCounts }) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [, startTransition] = useTransition();

    const current = (params.get("tab") ?? "all") as EmployeeTab;

    const setTab = (t: EmployeeTab) => {
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
