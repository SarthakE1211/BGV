"use client";

import { useEffect, useState } from "react";
import RequestForm from "@/src/components/requests/RequestForm";
import type { PartnerOption } from "@/src/lib/partners";

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function NewRequestModal({ open, onClose }: Props) {
    const [partners, setPartners] = useState<PartnerOption[]>([]);

    // Fetch partners once when the modal first opens
    useEffect(() => {
        if (!open || partners.length > 0) return;
        fetch("/api/partners")
            .then((r) => r.json())
            .then((d) => setPartners(d.partners ?? []))
            .catch(console.error);
    }, [open, partners.length]);

    // Lock body scroll while open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    if (!open) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(3px)",
                zIndex: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px 16px",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "#fff",
                    borderRadius: 12,
                    width: "100%",
                    maxWidth: 760,
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 22px",
                        borderBottom: "1px solid var(--border)",
                        flexShrink: 0,
                    }}
                >
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                        New BGV Request
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            fontSize: 20,
                            lineHeight: 1,
                            cursor: "pointer",
                            color: "var(--text-light)",
                            padding: "0 4px",
                        }}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Scrollable form body */}
                <div style={{ overflowY: "auto", flex: 1 }}>
                    <RequestForm partners={partners} onClose={onClose} inModal />
                </div>
            </div>
        </div>
    );
}
