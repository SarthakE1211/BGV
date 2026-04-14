// src/components/requests/RequestsPagination.tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Props {
    page: number;
    total: number;
    pageSize: number;
}

export default function RequestsPagination({ page, total, pageSize }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();

    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    if (pageCount <= 1) return null;

    const goto = (p: number) => {
        const sp = new URLSearchParams(params.toString());
        if (p <= 1) sp.delete("page");
        else sp.set("page", String(p));
        router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    };

    const first = Math.max(1, Math.min(page - 2, pageCount - 4));
    const window = [];
    for (let i = 0; i < 5 && first + i <= pageCount; i++) window.push(first + i);

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <div className="pagination">
            <div className="info">
                Showing <strong>{from}</strong>–<strong>{to}</strong> of{" "}
                <strong>{total}</strong>
            </div>
            <div className="pages">
                <button
                    className="page-btn"
                    onClick={() => goto(page - 1)}
                    disabled={page <= 1}
                >
                    Prev
                </button>
                {window.map((p) => (
                    <button
                        key={p}
                        className={`page-btn ${p === page ? "active" : ""}`}
                        onClick={() => goto(p)}
                    >
                        {p}
                    </button>
                ))}
                <button
                    className="page-btn"
                    onClick={() => goto(page + 1)}
                    disabled={page >= pageCount}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
