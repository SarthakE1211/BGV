"use client";

import { useState, useTransition } from "react";
import Modal from "@/src/components/ui/Modal";
import { updatePartnerStandardChecks } from "@/src/actions/partners";

interface Props {
    partnerId: string;
    partnerName: string;
    initialChecks: string[];
}

export default function PartnerChecksEditor({
    partnerId,
    partnerName,
    initialChecks,
}: Props) {
    const [open, setOpen] = useState(false);
    const [checks, setChecks] = useState<string[]>(initialChecks);
    const [input, setInput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, startSave] = useTransition();

    const openModal = () => {
        setChecks(initialChecks);
        setInput("");
        setError(null);
        setOpen(true);
    };

    const close = () => {
        if (!saving) setOpen(false);
    };

    const addCheck = () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        const exists = checks.some((c) => c.toUpperCase() === trimmed.toUpperCase());
        if (exists) {
            setError(`"${trimmed}" is already in the list`);
            return;
        }
        setChecks((prev) => [...prev, trimmed]);
        setInput("");
        setError(null);
    };

    const removeCheck = (idx: number) => {
        setChecks((prev) => prev.filter((_, i) => i !== idx));
    };

    const onSave = () => {
        setError(null);
        startSave(async () => {
            const res = await updatePartnerStandardChecks({ partnerId, checks });
            if (!res.ok) {
                setError(res.error);
                return;
            }
            setOpen(false);
        });
    };

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addCheck();
        }
    };

    const dirty =
        checks.length !== initialChecks.length ||
        checks.some((c, i) => c !== initialChecks[i]);

    return (
        <>
            <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ marginTop: 10 }}
                onClick={openModal}
            >
                Edit Standard Checks
            </button>

            <Modal
                open={open}
                onClose={close}
                title={`Edit Standard Checks — ${partnerName}`}
                maxWidth={520}
                footer={
                    <>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={close}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={onSave}
                            disabled={saving || !dirty}
                        >
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </>
                }
            >
                <p style={{ fontSize: 12, color: "var(--text-light)", margin: "0 0 12px" }}>
                    These checks are auto-loaded for every request submitted against{" "}
                    <strong>{partnerName}</strong>, unless a specific client account adds
                    overrides.
                </p>

                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    <input
                        type="text"
                        className="filter-input"
                        placeholder="Add a check (e.g. Criminal Check)"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            setError(null);
                        }}
                        onKeyDown={onKey}
                        style={{ flex: 1 }}
                        autoFocus
                    />
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={addCheck}
                        disabled={!input.trim()}
                    >
                        + Add
                    </button>
                </div>

                {checks.length === 0 ? (
                    <div className="info-box info-amber" style={{ margin: 0 }}>
                        No checks yet — add at least one so SDM submissions auto-load it.
                    </div>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            padding: 10,
                            background: "var(--bg)",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                        }}
                    >
                        {checks.map((c, i) => (
                            <span
                                key={`${c}-${i}`}
                                className="check-tag"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "3px 8px",
                                    background: "#fff",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                {c}
                                <button
                                    type="button"
                                    onClick={() => removeCheck(i)}
                                    disabled={saving}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#dc2626",
                                        cursor: "pointer",
                                        fontSize: 14,
                                        lineHeight: 1,
                                        padding: 0,
                                    }}
                                    aria-label={`Remove ${c}`}
                                    title="Remove"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="info-box info-red" style={{ margin: "10px 0 0" }}>
                        {error}
                    </div>
                )}
            </Modal>
        </>
    );
}
