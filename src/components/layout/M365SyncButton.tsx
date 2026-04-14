"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { syncM365Users } from "@/src/actions/m365";

export default function M365SyncButton() {
    const [pending, start] = useTransition();

    const onClick = () => {
        start(async () => {
            const id = toast.loading("Syncing users from Microsoft 365…");
            const res = await syncM365Users();
            if (res.ok) {
                console.log("res",res)
                const { total, created, updated, skipped, durationMs } = res.result;
                toast.success(
                    `Synced ${total} user${total === 1 ? "" : "s"} — ${created} new, ${updated} updated${
                        skipped ? `, ${skipped} skipped` : ""
                    } (${Math.round(durationMs / 100) / 10}s)`,
                    { id }
                );
            } else {
                toast.error(res.error, { id });
            }
        });
    };

    return (
        <button
            className="btn btn-outline btn-sm"
            onClick={onClick}
            disabled={pending}
            title="Pull users from Microsoft 365 / Azure AD into the portal"
        >
            <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={pending ? { animation: "spin 1s linear infinite" } : undefined}
            >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            {pending ? "Syncing…" : "M365 Sync"}
        </button>
    );
}
