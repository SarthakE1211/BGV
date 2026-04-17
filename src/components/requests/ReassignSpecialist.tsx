"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignSpecialistToRequest } from "@/src/actions/checks";

interface Props {
    requestId: string;
    currentSpecialistId: string | null;
}

export default function ReassignSpecialist({ requestId, currentSpecialistId }: Props) {
    const router = useRouter();
    const [specialists, setSpecialists] = useState<Array<{ id: string; name: string }>>([]);
    const [value, setValue] = useState(currentSpecialistId ?? "");
    const [saving, startSave] = useTransition();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/specialists")
            .then((r) => r.json())
            .then((d) => setSpecialists(d.specialists ?? []))
            .catch(console.error);
    }, []);

    const dirty = value !== (currentSpecialistId ?? "");

    const onSave = () => {
        setError(null);
        startSave(async () => {
            const res = await assignSpecialistToRequest(requestId, value);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            router.refresh();
        });
    };

    return (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={saving}
                style={{
                    padding: "4px 8px",
                    fontSize: 12,
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    background: "#fff",
                    maxWidth: 220,
                }}
            >
                <option value="">— Unassigned —</option>
                {specialists.map((s) => (
                    <option key={s.id} value={s.id}>
                        {s.name}
                    </option>
                ))}
            </select>
            {dirty && (
                <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: "4px 10px", fontSize: 11 }}
                    onClick={onSave}
                    disabled={saving}
                >
                    {saving ? "Saving..." : "Save"}
                </button>
            )}
            {error && (
                <span style={{ color: "#dc2626", fontSize: 11 }}>{error}</span>
            )}
        </div>
    );
}
