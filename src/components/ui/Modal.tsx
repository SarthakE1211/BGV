// src/components/ui/Modal.tsx
"use client";

import { useEffect } from "react";

interface Props {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: number;
}

export default function Modal({ open, onClose, title, children, footer, maxWidth }: Props) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal"
                style={maxWidth ? { maxWidth } : undefined}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-head">
                    <h3>{title}</h3>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}
