"use client";

import { useState, useTransition } from "react";
import { toggleSetting } from "@/src/actions/settings";

interface Props {
    settingKey: string;
    label: string;
    description: string;
    initialOn: boolean;
}

export default function SettingsToggle({
    settingKey,
    label,
    description,
    initialOn,
}: Props) {
    const [on, setOn] = useState(initialOn);
    const [saving, startSaving] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const flip = () => {
        if (saving) return;
        const next = !on;
        setOn(next); // optimistic update
        setError(null);
        startSaving(async () => {
            const res = await toggleSetting(settingKey, next);
            if (!res.ok) {
                setOn(!next); // rollback
                setError(res.error);
            }
        });
    };

    return (
        <div className="setting-row">
            <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--text-light)" }}>
                    {description}
                </div>
                {error && (
                    <div style={{ fontSize: 11, color: "#dc2626", marginTop: 2 }}>
                        {error}
                    </div>
                )}
            </div>
            <button
                type="button"
                onClick={flip}
                disabled={saving}
                aria-pressed={on}
                aria-label={`${label}: ${on ? "enabled" : "disabled"}`}
                className={`toggle ${on ? "on" : ""}`}
                style={{
                    border: "none",
                    padding: 0,
                    cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.7 : 1,
                }}
            />
        </div>
    );
}
