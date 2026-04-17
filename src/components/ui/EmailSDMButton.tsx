// src/components/ui/EmailSDMButton.tsx
// Sends a BGV status update email to the SDM of a given request.

"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
    requestId: string;
    /** Optional extra classes for the button */
    className?: string;
}

type State = "idle" | "sending" | "sent" | "error";

export default function EmailSDMButton({ requestId, className = "" }: Props) {
    const [state, setState] = useState<State>("idle");

    async function handleClick() {
        if (state === "sending" || state === "sent") return;
        setState("sending");
        try {
            const res = await fetch(`/api/requests/${requestId}/email-sdm`, {
                method: "POST",
            });
            if (res.ok) {
                setState("sent");
                toast.success("Email sent to SDM successfully.");
            } else {
                const json = await res.json().catch(() => ({}));
                setState("error");
                toast.error(json?.error ?? "Failed to send email. Please try again.", { duration: 6000 });
            }
        } catch {
            setState("error");
            toast.error("Network error — could not send email.", { duration: 6000 });
        }
    }

    const label =
        state === "sending"
            ? "Sending…"
            : state === "sent"
            ? "Email Sent ✓"
            : state === "error"
            ? "Failed — Retry"
            : "Email SDM Update";

    const btnClass =
        state === "sent"
            ? "btn btn-success"
            : state === "error"
            ? "btn btn-danger"
            : "btn btn-warning";

    return (
        <button
            className={`${btnClass} ${className}`}
            onClick={handleClick}
            disabled={state === "sending" || state === "sent"}
            style={{ minWidth: 160 }}
        >
            {label}
        </button>
    );
}
