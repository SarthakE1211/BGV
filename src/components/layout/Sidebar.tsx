// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { useState } from "react";

// ─── Nav item definitions ─────────────────────────────────────────────────────

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    roles: UserRole[];
    badge?: string;
}

const NAV_ITEMS: NavItem[] = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: <IconDashboard />,
        roles: [UserRole.SDM, UserRole.SPECIALIST, UserRole.HR_HEAD],
    },
    {
        label: "BGV Requests",
        href: "/requests",
        icon: <IconRequests />,
        roles: [UserRole.SDM, UserRole.SPECIALIST, UserRole.HR_HEAD],
    },
    {
        label: "New Request",
        href: "/requests/new",
        icon: <IconPlus />,
        roles: [UserRole.SDM, UserRole.HR_HEAD],
    },
    {
        label: "Check Tracker",
        href: "/tracker",
        icon: <IconTracker />,
        roles: [UserRole.SPECIALIST, UserRole.HR_HEAD],
    },
    {
        label: "Employee Database",
        href: "/database",
        icon: <IconDatabase />,
        roles: [UserRole.SDM, UserRole.SPECIALIST, UserRole.HR_HEAD],
    },
    {
        label: "Blacklist Registry",
        href: "/blacklist",
        icon: <IconBlacklist />,
        roles: [UserRole.HR_HEAD],
    },
    {
        label: "Reports",
        href: "/reports",
        icon: <IconReports />,
        roles: [UserRole.SPECIALIST, UserRole.HR_HEAD],
    },
    {
        label: "Partners",
        href: "/partners",
        icon: <IconPartners />,
        roles: [UserRole.HR_HEAD],
    },
    {
        label: "Settings",
        href: "/settings",
        icon: <IconSettings />,
        roles: [UserRole.HR_HEAD],
    },
];

// Role display labels + accent colors
const ROLE_META: Record<UserRole, { label: string; color: string; bg: string }> = {
    [UserRole.SDM]: {
        label: "Service Delivery Manager",
        color: "#60a5fa",
        bg: "rgba(96,165,250,0.12)",
    },
    [UserRole.SPECIALIST]: {
        label: "BGV Specialist",
        color: "#34d399",
        bg: "rgba(52,211,153,0.12)",
    },
    [UserRole.HR_HEAD]: {
        label: "HR Head",
        color: "#f59e0b",
        bg: "rgba(245,158,11,0.12)",
    },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProps {
    role: UserRole;
    userName: string;
    userEmail: string;
    userInitials: string;
}

export default function Sidebar({
    role,
    userName,
    userEmail,
    userInitials,
}: SidebarProps) {
    const pathname = usePathname();
    const [signingOut, setSigningOut] = useState(false);

    const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
    const roleMeta = ROLE_META[role];

    const handleSignOut = async () => {
        setSigningOut(true);
        await signOut({ callbackUrl: "/auth/signin" });
    };

    return (
        <aside style={styles.sidebar}>
            {/* Logo / Brand */}
            <div style={styles.brand}>
                <div style={styles.brandIcon}>
                    <ShieldLogo />
                </div>
                <div>
                    <div style={styles.brandName}>BGV Portal</div>
                    <div style={styles.brandSub}>Ovation Workplace Services</div>
                </div>
            </div>

            <div style={styles.divider} />

            {/* Navigation */}
            <nav style={styles.nav}>
                <div style={styles.navLabel}>Navigation</div>
                {visibleItems.map((item) => {
                    const isActive =
                        item.href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname.startsWith(item.href);

                    return (
                        <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                            <div style={{ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) }}>
                                <span style={{ ...styles.navIcon, ...(isActive ? styles.navIconActive : {}) }}>
                                    {item.icon}
                                </span>
                                <span style={{ ...styles.navItemLabel, ...(isActive ? styles.navItemLabelActive : {}) }}>
                                    {item.label}
                                </span>
                                {isActive && <div style={styles.activeBar} />}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div style={{ flex: 1 }} />

            {/* Role badge */}
            <div style={{ padding: "0 12px 12px" }}>
                <div style={{ ...styles.roleBadge, background: roleMeta.bg }}>
                    <div style={{ ...styles.roleDot, background: roleMeta.color }} />
                    <div>
                        <div style={{ ...styles.roleLabel, color: roleMeta.color }}>
                            {role.replace("_", " ")}
                        </div>
                        <div style={styles.roleDesc}>{roleMeta.label}</div>
                    </div>
                </div>
            </div>

            <div style={styles.divider} />

            {/* User profile + sign out */}
            <div style={styles.userSection}>
                <div style={styles.avatar}>{userInitials}</div>
                <div style={styles.userInfo}>
                    <div style={styles.userName}>{userName}</div>
                    <div style={styles.userEmail}>{userEmail}</div>
                </div>
                <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    style={styles.signOutBtn}
                    title="Sign out"
                >
                    {signingOut ? <IconSpinner /> : <IconSignOut />}
                </button>
            </div>
        </aside>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    sidebar: {
        width: 240,
        minWidth: 240,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        fontFamily: "'Geist', 'DM Sans', system-ui, sans-serif",
        overflowY: "auto",
        overflowX: "hidden",
    },
    brand: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "20px 16px 16px",
    },
    brandIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        background: "rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    brandName: {
        fontSize: 15,
        fontWeight: 600,
        color: "#f8fafc",
        letterSpacing: "-0.3px",
    },
    brandSub: {
        fontSize: 11,
        color: "rgba(255,255,255,0.35)",
        marginTop: 1,
    },
    divider: {
        height: "1px",
        background: "rgba(255,255,255,0.06)",
        margin: "0 16px",
    },
    nav: {
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
    },
    navLabel: {
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.25)",
        letterSpacing: "0.8px",
        textTransform: "uppercase",
        padding: "4px 10px 8px",
    },
    navItem: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 7,
        cursor: "pointer",
        position: "relative",
        transition: "background 0.15s",
        textDecoration: "none",
    },
    navItemActive: {
        background: "rgba(255,255,255,0.07)",
    },
    navIcon: {
        width: 18,
        height: 18,
        color: "rgba(255,255,255,0.35)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    navIconActive: {
        color: "#f8fafc",
    },
    navItemLabel: {
        fontSize: 13.5,
        color: "rgba(255,255,255,0.5)",
        fontWeight: 400,
        flex: 1,
    },
    navItemLabelActive: {
        color: "#f8fafc",
        fontWeight: 500,
    },
    activeBar: {
        position: "absolute",
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        width: 3,
        height: 16,
        background: "#3b82f6",
        borderRadius: "3px 0 0 3px",
    },
    roleBadge: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 7,
        border: "1px solid rgba(255,255,255,0.06)",
    },
    roleDot: {
        width: 7,
        height: 7,
        borderRadius: "50%",
        flexShrink: 0,
    },
    roleLabel: {
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.2px",
    },
    roleDesc: {
        fontSize: 10.5,
        color: "rgba(255,255,255,0.3)",
        marginTop: 1,
    },
    userSection: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 12px 16px",
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "rgba(59,130,246,0.25)",
        color: "#60a5fa",
        fontSize: 12,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        letterSpacing: "0.5px",
    },
    userInfo: {
        flex: 1,
        minWidth: 0,
    },
    userName: {
        fontSize: 13,
        fontWeight: 500,
        color: "#f1f5f9",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    userEmail: {
        fontSize: 11,
        color: "rgba(255,255,255,0.3)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        marginTop: 1,
    },
    signOutBtn: {
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "transparent",
        color: "rgba(255,255,255,0.35)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: 0,
        transition: "all 0.15s",
    },
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function ShieldLogo() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
        </svg>
    );
}

function IconDashboard() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    );
}

function IconRequests() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
    );
}

function IconPlus() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    );
}

function IconTracker() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    );
}

function IconDatabase() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
    );
}

function IconBlacklist() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
    );
}

function IconReports() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    );
}

function IconPartners() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function IconSettings() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

function IconSignOut() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}

function IconSpinner() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
    );
}