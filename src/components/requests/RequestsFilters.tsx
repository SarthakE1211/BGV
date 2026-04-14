// src/components/requests/RequestsFilters.tsx
"use client";

// Search input + 4 filter dropdowns + "+ New Request" button.
// Lives inside the table-card header next to the <h3> title.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { UserRole } from "@/src/lib/enums";

interface Props {
    partners: Array<{ code: string; name: string }>;
    sdms: Array<{ id: string; name: string }>;
    role: UserRole;
}

export default function RequestsFilters({ partners, sdms, role }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [, startTransition] = useTransition();

    const [qLocal, setQLocal] = useState(params.get("q") ?? "");
    useEffect(() => {
        setQLocal(params.get("q") ?? "");
    }, [params]);

    const navigate = useCallback(
        (mutate: (sp: URLSearchParams) => void) => {
            const sp = new URLSearchParams(params.toString());
            mutate(sp);
            sp.delete("page");
            startTransition(() => {
                router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
            });
        },
        [params, pathname, router]
    );

    const setParam = (key: string, value: string) =>
        navigate((sp) => {
            if (value) sp.set(key, value);
            else sp.delete(key);
        });

    const canCreateRequest = role === "SDM" || role === "HR_HEAD";

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
                style={{ width: 180 }}
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
                value={params.get("roleType") ?? ""}
                onChange={(e) => setParam("roleType", e.target.value)}
            >
                <option value="">All Roles</option>
                <option value="FTE_W2">FTE W2</option>
                <option value="PRO">PRO</option>
                <option value="DISPATCH">Dispatch</option>
                <option value="BACKFILL">Backfill</option>
            </select>
            <select
                className="filter-input"
                value={params.get("region") ?? ""}
                onChange={(e) => setParam("region", e.target.value)}
            >
                <option value="">All Regions</option>
                <option value="USA">USA</option>
                <option value="CANADA">Canada</option>
                <option value="LATAM">LATAM</option>
            </select>
            {role !== "SDM" && (
                <select
                    className="filter-input"
                    value={params.get("sdm") ?? ""}
                    onChange={(e) => setParam("sdm", e.target.value)}
                >
                    <option value="">All SDMs</option>
                    {sdms.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.name}
                        </option>
                    ))}
                </select>
            )}
            {canCreateRequest && (
                <Link href="/requests/new" className="btn btn-primary btn-sm">
                    + New Request
                </Link>
            )}
        </div>
    );
}
