// src/components/tracker/TrackerFilters.tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

interface Props {
    partners: Array<{ code: string; name: string }>;
    specialists: Array<{ id: string; name: string }>;
}

export default function TrackerFilters({ partners, specialists }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [, startTransition] = useTransition();

    const [qLocal, setQLocal] = useState(params.get("q") ?? "");
    useEffect(() => setQLocal(params.get("q") ?? ""), [params]);

    const setParam = (key: string, value: string) => {
        const sp = new URLSearchParams(params.toString());
        if (value) sp.set(key, value);
        else sp.delete(key);
        sp.delete("page");
        startTransition(() => {
            router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
        });
    };

    return (
        <div className="table-filters">
            <input
                className="filter-input"
                placeholder="Search technician..."
                value={qLocal}
                onChange={(e) => setQLocal(e.target.value)}
                onBlur={() => setParam("q", qLocal.trim())}
                onKeyDown={(e) => {
                    if (e.key === "Enter") setParam("q", qLocal.trim());
                }}
                style={{ width: 160 }}
            />
            <select
                className="filter-input"
                value={params.get("partner") ?? ""}
                onChange={(e) => setParam("partner", e.target.value)}
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
                value={params.get("specialist") ?? ""}
                onChange={(e) => setParam("specialist", e.target.value)}
            >
                <option value="">All Specialists</option>
                {specialists.map((s) => (
                    <option key={s.id} value={s.id}>
                        {s.name}
                    </option>
                ))}
            </select>
            <select
                className="filter-input"
                value={params.get("status") ?? ""}
                onChange={(e) => setParam("status", e.target.value)}
            >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="CLEARED">Cleared</option>
                <option value="FAILED">Failed</option>
            </select>
        </div>
    );
}
