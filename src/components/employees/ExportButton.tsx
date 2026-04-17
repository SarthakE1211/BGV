"use client";

import { useState } from "react";

interface Props {
    tab?: string;
    q?: string;
}

export default function ExportButton({ tab, q }: Props) {
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (tab && tab !== "all") params.set("tab", tab);
            if (q) params.set("q", q);

            const res = await fetch(`/api/database/export?${params.toString()}`);
            if (!res.ok) throw new Error("Export failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            // Use filename from Content-Disposition if available
            const cd = res.headers.get("Content-Disposition") ?? "";
            const match = cd.match(/filename="([^"]+)"/);
            a.download = match ? match[1] : "BGV_Employee_Database.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={loading}
            onClick={handleExport}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
            {loading ? (
                <>
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ animation: "spin 1s linear infinite" }}
                    >
                        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".25" />
                        <path d="M21 12a9 9 0 0 1-9 9" />
                    </svg>
                    Exporting…
                </>
            ) : (
                <>
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export Excel
                </>
            )}
        </button>
    );
}
