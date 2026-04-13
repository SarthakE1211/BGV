// src/components/layout/Topbar.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { UserRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import Image from "next/image";

// ─── Route → page title + breadcrumb map ──────────────────────────────────────

const ROUTE_MAP: Record<string, { title: string; crumbs: { label: string; href?: string }[] }> = {
    "/dashboard": {
        title: "Dashboard",
        crumbs: [{ label: "Dashboard" }],
    },
    "/requests": {
        title: "BGV Requests",
        crumbs: [{ label: "Requests" }],
    },
    "/requests/new": {
        title: "New BGV Request",
        crumbs: [{ label: "Requests", href: "/requests" }, { label: "New Request" }],
    },
    "/tracker": {
        title: "Check Tracker",
        crumbs: [{ label: "Tracker" }],
    },
    "/database": {
        title: "Employee Database",
        crumbs: [{ label: "Database" }],
    },
    "/blacklist": {
        title: "Blacklist Registry",
        crumbs: [{ label: "Blacklist" }],
    },
    "/reports": {
        title: "Reports",
        crumbs: [{ label: "Reports" }],
    },
    "/partners": {
        title: "Partners & Check Config",
        crumbs: [{ label: "Partners" }],
    },
    "/settings": {
        title: "Settings",
        crumbs: [{ label: "Settings" }],
    },
};

function resolveRoute(pathname: string) {
    // Exact match first
    if (ROUTE_MAP[pathname]) return ROUTE_MAP[pathname];

    // Request detail page: /requests/[id]
    if (pathname.startsWith("/requests/") && pathname !== "/requests/new") {
        return {
            title: "Request Detail",
            crumbs: [{ label: "Requests", href: "/requests" }, { label: "View Request" }],
        };
    }

    return { title: "BGV Portal", crumbs: [{ label: "BGV Portal" }] };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TopbarProps {
    userName: string;
    userRole: UserRole;
    /** Count of pending items needing attention (requests awaiting approval, etc.) */
    pendingCount?: number;
    image?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Topbar({ userName, userRole, pendingCount = 0, image }: TopbarProps) {
    const pathname = usePathname();
    const route = resolveRoute(pathname);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [notifOpen, setNotifOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    // Focus search input when opened
    useEffect(() => {
        if (searchOpen) searchRef.current?.focus();
    }, [searchOpen]);

    // Close notification dropdown on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const roleLabel: Record<UserRole, string> = {
        [UserRole.SDM]: "SDM",
        [UserRole.SPECIALIST]: "Specialist",
        [UserRole.HR_HEAD]: "HR Head",
    };

    const roleColor: Record<UserRole, string> = {
        [UserRole.SDM]: "#60a5fa",
        [UserRole.SPECIALIST]: "#34d399",
        [UserRole.HR_HEAD]: "#f59e0b",
    };
    const handleLogout = () => {
        signOut({
            callbackUrl:
                "https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=http://localhost:3000",
        });
    };
    return (
        <header style={styles.topbar}>
            {/* Left — breadcrumbs */}
            <div style={styles.left}>
                <div style={styles.breadcrumbs}>
                    {route.crumbs.map((crumb, i) => (
                        <span key={i} style={styles.crumbGroup}>
                            {i > 0 && <span style={styles.crumbSep}>/</span>}
                            {crumb.href ? (
                                <Link href={crumb.href} style={styles.crumbLink}>
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span style={styles.crumbCurrent}>{crumb.label}</span>
                            )}
                        </span>
                    ))}
                </div>
                <h1 style={styles.pageTitle}>{route.title}</h1>
            </div>

            {/* Right — search + notifications + user pill */}
            <div style={styles.right}>

                {/* Search */}
                <div style={styles.searchWrap}>
                    {searchOpen ? (
                        <div style={styles.searchInputWrap}>
                            <span style={styles.searchIcon}><IconSearch /></span>
                            <input
                                ref={searchRef}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder="Search candidates, requests…"
                                style={styles.searchInput}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                        setSearchOpen(false);
                                        setSearchValue("");
                                    }
                                }}
                            />
                            {searchValue && (
                                <button
                                    style={styles.searchClearBtn}
                                    onClick={() => setSearchValue("")}
                                >×</button>
                            )}
                        </div>
                    ) : (
                        <button
                            style={styles.iconBtn}
                            onClick={() => setSearchOpen(true)}
                            title="Search"
                        >
                            <IconSearch />
                        </button>
                    )}
                </div>

                {/* Notifications bell */}
                <div style={{ position: "relative" }} ref={notifRef}>
                    <button
                        style={styles.iconBtn}
                        onClick={() => setNotifOpen(!notifOpen)}
                        title="Notifications"
                    >
                        <IconBell />
                        {pendingCount > 0 && (
                            <span style={styles.notifBadge}>
                                {pendingCount > 9 ? "9+" : pendingCount}
                            </span>
                        )}
                    </button>

                    {notifOpen && (
                        <div style={styles.notifDropdown}>
                            <div style={styles.notifHeader}>Notifications</div>
                            {pendingCount > 0 ? (
                                <div style={styles.notifItem}>
                                    <div style={styles.notifDot} />
                                    <div>
                                        <div style={styles.notifText}>
                                            {pendingCount} request{pendingCount !== 1 ? "s" : ""} pending approval
                                        </div>
                                        <div style={styles.notifTime}>Review in BGV Requests</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={styles.notifEmpty}>No new notifications</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div style={styles.vertDivider} />

                {/* User pill */}
                <div style={styles.userPill}>
                    <div style={styles.userPillAvatar}>
                        {image ? (
                            <Image
                                src={image}
                                alt="user"
                                width={28}
                                height={28}
                                style={{
                                    borderRadius: "6px",
                                    objectFit: "cover",
                                }}
                                unoptimized // ✅ important for base64 images
                            />
                        ) : (
                            userName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                        )}
                    </div>
                    <div style={styles.userPillInfo}>
                        <span style={styles.userPillName}>{userName.split(" ")[0]}</span>
                        <span style={{ ...styles.userPillRole, color: roleColor[userRole] }}>
                            {roleLabel[userRole]}
                        </span>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: "10px 16px",
                        background: "linear-gradient(135deg, #16971b, #0d9f26)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
                        transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)";
                    }}
                >
                    {/* Icon */}
                    {/* <span style={{ fontSize: "16px" }}>🚪</span> */}
                    Logout
                </button>
            </div>

        </header>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    topbar: {
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "#ffffff",
        borderBottom: "1px solid #f1f5f9",
        fontFamily: "'Geist', 'DM Sans', system-ui, sans-serif",
        position: "sticky",
        top: 0,
        zIndex: 10,
        gap: 16,
    },
    left: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minWidth: 0,
    },
    breadcrumbs: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginBottom: 1,
    },
    crumbGroup: {
        display: "flex",
        alignItems: "center",
        gap: 4,
    },
    crumbSep: {
        color: "#cbd5e1",
        fontSize: 12,
    },
    crumbLink: {
        fontSize: 11,
        color: "#94a3b8",
        textDecoration: "none",
    },
    crumbCurrent: {
        fontSize: 11,
        color: "#64748b",
        fontWeight: 500,
    },
    pageTitle: {
        fontSize: 16,
        fontWeight: 600,
        color: "#0f172a",
        letterSpacing: "-0.3px",
        margin: 0,
        lineHeight: 1,
    },
    right: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
    },
    searchWrap: {
        display: "flex",
        alignItems: "center",
    },
    searchInputWrap: {
        display: "flex",
        alignItems: "center",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "0 10px",
        height: 34,
        gap: 6,
        width: 240,
        transition: "all 0.2s",
    },
    searchIcon: {
        color: "#94a3b8",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
    },
    searchInput: {
        border: "none",
        background: "transparent",
        outline: "none",
        fontSize: 13,
        color: "#1e293b",
        flex: 1,
        minWidth: 0,
    },
    searchClearBtn: {
        background: "none",
        border: "none",
        color: "#94a3b8",
        cursor: "pointer",
        fontSize: 16,
        padding: 0,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        border: "1px solid #f1f5f9",
        background: "transparent",
        color: "#64748b",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        transition: "all 0.15s",
        padding: 0,
    },
    notifBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        background: "#ef4444",
        color: "#fff",
        fontSize: 9,
        fontWeight: 700,
        borderRadius: "10px",
        padding: "1px 4px",
        lineHeight: 1.4,
        border: "1.5px solid #fff",
    },
    notifDropdown: {
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 280,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        zIndex: 50,
        overflow: "hidden",
    },
    notifHeader: {
        padding: "12px 14px 8px",
        fontSize: 12,
        fontWeight: 600,
        color: "#64748b",
        letterSpacing: "0.3px",
        borderBottom: "1px solid #f1f5f9",
    },
    notifItem: {
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
    },
    notifDot: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "#3b82f6",
        marginTop: 4,
        flexShrink: 0,
    },
    notifText: {
        fontSize: 13,
        color: "#1e293b",
        fontWeight: 500,
    },
    notifTime: {
        fontSize: 11,
        color: "#94a3b8",
        marginTop: 2,
    },
    notifEmpty: {
        padding: "20px 14px",
        fontSize: 13,
        color: "#94a3b8",
        textAlign: "center",
    },
    vertDivider: {
        width: 1,
        height: 20,
        background: "#e2e8f0",
        margin: "0 4px",
    },
    userPill: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px 4px 4px",
        borderRadius: 8,
        border: "1px solid #f1f5f9",
        background: "#fafafa",
        cursor: "default",
    },
    userPillAvatar: {
        width: 28,
        height: 28,
        borderRadius: 6,
        background: "#1e3a5f",
        color: "#93c5fd",
        fontSize: 11,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        letterSpacing: "0.5px",
        flexShrink: 0,
    },
    userPillInfo: {
        display: "flex",
        flexDirection: "column",
        gap: 1,
    },
    userPillName: {
        fontSize: 13,
        fontWeight: 500,
        color: "#1e293b",
        lineHeight: 1,
    },
    userPillRole: {
        fontSize: 10.5,
        fontWeight: 500,
        lineHeight: 1,
    },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconSearch() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function IconBell() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}