// src/components/employees/EmployeeSearch.tsx
"use client";

// Debounced search bar that writes ?q= to the URL. The server page
// re-renders with the new SQL on each settle.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export default function EmployeeSearch() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [, startTransition] = useTransition();
    const [val, setVal] = useState(params.get("q") ?? "");
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => setVal(params.get("q") ?? ""), [params]);

    const apply = (v: string) => {
        const sp = new URLSearchParams(params.toString());
        if (v.trim()) sp.set("q", v.trim());
        else sp.delete("q");
        sp.delete("page");
        startTransition(() => {
            router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
        });
    };

    const onChange = (v: string) => {
        setVal(v);
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => apply(v), 300);
    };

    return (
        <div className="search-bar">
            <input
                placeholder="Search by name, email, partner, client, or BGV ID..."
                value={val}
                onChange={(e) => onChange(e.target.value)}
            />
            <button
                className="btn btn-outline"
                onClick={() => alert("Export to Excel — coming soon")}
            >
                Export to Excel
            </button>
        </div>
    );
}
