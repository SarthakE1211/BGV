// src/components/layout/Topbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/src/lib/enums";

const ROUTE_TITLE: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/requests": "BGV Requests",
    "/requests/new": "New BGV Request",
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

    return (
        <div className="topbar">
            <h1 id="page-title">{title}</h1>
            <div className="topbar-actions">
                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => window.dispatchEvent(new CustomEvent("m365:sync"))}
                    title="Synced with Microsoft 365"
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                    </svg>
                    M365 Sync
                </button>
                {canCreateRequest && (
                    <Link href="/requests/new" className="btn btn-primary btn-sm">
                        + New BGV Request
                    </Link>
                )}
            </div>
        </div>
    );
}
