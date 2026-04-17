"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initiateRequest } from "@/src/actions/requests";

interface Props {
    requestId: string;
    size?: "sm" | "md";
    /** Called on successful initiate. If omitted, refreshes the current route. */
    onDone?: () => void;
}

export default function InitiateButton({ requestId, size = "md", onDone }: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const onClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setError(null);
        startTransition(async () => {
            const res = await initiateRequest(requestId);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            if (onDone) onDone();
            else router.refresh();
        });
    };

    const btnStyle: React.CSSProperties =
        size === "sm"
            ? { fontSize: 11, padding: "4px 10px" }
            : { fontSize: 12, padding: "6px 14px" };

    return (
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <button
                type="button"
                className="btn btn-primary"
                onClick={onClick}
                disabled={pending}
                style={btnStyle}
            >
                {pending ? "Initiating…" : "Initiate BGV"}
            </button>
            {error && (
                <span style={{ fontSize: 11, color: "#dc2626" }}>{error}</span>
            )}
        </div>
    );
}
