"use client";

import { useState, useTransition } from "react";
import { updateClientAccount } from "@/src/actions/requests";

interface Props {
    requestId: string;
    initialValue: string | null;
    readonly?: boolean;
}

export default function ClientAccountEditor({ requestId, initialValue, readonly }: Props) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(initialValue ?? "");
    const [saved, setSaved] = useState(initialValue ?? "");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    if (readonly) {
        return <span>{saved || "—"}</span>;
    }

    if (!editing) {
        return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span>{saved || "—"}</span>
                <button
                    onClick={() => { setValue(saved); setEditing(true); setError(null); }}
                    title="Edit client account"
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-light)",
                        padding: "0 2px",
                        lineHeight: 1,
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
            </span>
        );
    }

    const handleSave = () => {
        setError(null);
        startTransition(async () => {
            const res = await updateClientAccount(requestId, value);
            if (res.ok) {
                setSaved(value.trim());
                setEditing(false);
            } else {
                setError(res.error);
            }
        });
    };

    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setEditing(false);
                }}
                placeholder="e.g. Microsoft, Cigna..."
                autoFocus
                style={{
                    fontSize: 13,
                    padding: "2px 6px",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    width: 160,
                }}
            />
            <button
                onClick={handleSave}
                disabled={pending}
                style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    background: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                }}
            >
                {pending ? "…" : "Save"}
            </button>
            <button
                onClick={() => setEditing(false)}
                disabled={pending}
                style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    cursor: "pointer",
                }}
            >
                ✕
            </button>
            {error && <span style={{ fontSize: 11, color: "red" }}>{error}</span>}
        </span>
    );
}
