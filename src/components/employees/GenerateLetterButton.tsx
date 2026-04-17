"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateClearanceLetter } from "@/src/actions/requests";

interface Props {
    requestId: string;
}

export default function GenerateLetterButton({ requestId }: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const onClick = () => {
        setError(null);
        startTransition(async () => {
            const res = await generateClearanceLetter(requestId);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            // Open the populated letter in a new tab for print / save-as-PDF.
            window.open(`/api/requests/${requestId}/letter`, "_blank", "noopener,noreferrer");
            router.refresh();
        });
    };

    return (
        <div style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
            <button
                type="button"
                className="btn btn-sm btn-accent"
                onClick={onClick}
                disabled={pending}
            >
                {pending ? "Generating…" : "Generate"}
            </button>
            {error && (
                <span style={{ fontSize: 10, color: "red" }}>{error}</span>
            )}
        </div>
    );
}
