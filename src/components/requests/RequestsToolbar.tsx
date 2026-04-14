// src/components/requests/RequestsToolbar.tsx
"use client";

// Just the tab bar. Filters live in RequestsFilters (rendered inside the
// table-card's header by the server page).

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { RequestsTab, TabCounts } from "@/src/lib/requests";

const TABS: Array<{ id: RequestsTab; label: string }> = [
    { id: "all", label: "All Requests" },
    { id: "pending", label: "Pending Initiation" },
    { id: "in-progress", label: "In Progress" },
    { id: "awaiting-approval", label: "Awaiting Approval" },
    { id: "complete", label: "Green / Complete" },
];

export default function RequestsToolbar({ tabCounts }: { tabCounts: TabCounts }) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [, startTransition] = useTransition();

    const currentTab = (params.get("tab") ?? "all") as RequestsTab;

    const setTab = useCallback(
        (id: RequestsTab) => {
            const sp = new URLSearchParams(params.toString());
            if (id === "all") sp.delete("tab");
            else sp.set("tab", id);
            sp.delete("page");
            startTransition(() => {
                router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
            });
        },
        [params, pathname, router]
    );

    return (
        <div className="tab-bar">
            {TABS.map((t) => {
                const active = currentTab === t.id;
                return (
                    <button
                        key={t.id}
                        type="button"
                        className={`tab ${active ? "active" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        {t.label}
                        <span className="tab-count">{tabCounts[t.id]}</span>
                    </button>
                );
            })}
        </div>
    );
}
