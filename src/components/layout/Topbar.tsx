// src/components/layout/Topbar.tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { UserRole } from "@/src/lib/enums";
import M365SyncButton from "@/src/components/layout/M365SyncButton";
import NewRequestModal from "@/src/components/requests/NewRequestModal";
import ThemeToggle from "@/src/components/theme/ThemeToggle";

const ROUTE_TITLE: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/requests": "BGV Requests",
    "/tracker": "BGV Tracker",
    "/database": "Employee Database",
    "/blacklist": "Blacklist Registry",
    "/reports": "Daily Report",
    "/partners": "Partners & Checks",
    "/settings": "Settings",
};

function resolveTitle(pathname: string) {
    if (ROUTE_TITLE[pathname]) return ROUTE_TITLE[pathname];
    if (pathname.startsWith("/requests/")) return "Request Detail";
    return "BGV Portal";
}

interface Props {
    role: UserRole;
}

export default function Topbar({ role }: Props) {
    const pathname = usePathname();
    const title = resolveTitle(pathname);
    const canCreateRequest = role === "SDM" || role === "HR_HEAD";
    const canSyncM365 = role === "HR_HEAD";
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <div className="topbar">
                <h1 id="page-title">{title}</h1>
                <div className="topbar-actions">
                    <ThemeToggle />
                    {canSyncM365 && <M365SyncButton />}
                    {canCreateRequest && (
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setModalOpen(true)}
                        >
                            + New BGV Request
                        </button>
                    )}
                </div>
            </div>
            {canCreateRequest && (
                <NewRequestModal open={modalOpen} onClose={() => setModalOpen(false)} />
            )}
        </>
    );
}
