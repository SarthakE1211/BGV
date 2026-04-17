// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { UserRole } from "@/src/lib/enums";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    roles: UserRole[];
}

interface NavSection {
    label: string;
    items: NavItem[];
}

const SECTIONS: NavSection[] = [
    {
        label: "Main",
        items: [
            {
                label: "Dashboard",
                href: "/dashboard",
                roles: [UserRole.SDM, UserRole.SPECIALIST, UserRole.HR_HEAD],
                icon: <IconDashboard />,
            },
            {
                label: "BGV Requests",
                href: "/requests",
                roles: [UserRole.SDM, UserRole.SPECIALIST, UserRole.HR_HEAD],
                icon: <IconRequests />,
            },
        ],
    },
    {
        label: "Operations",
        items: [
            {
                label: "BGV Tracker",
                href: "/tracker",
                roles: [UserRole.SPECIALIST, UserRole.HR_HEAD],
                icon: <IconTracker />,
            },
            {
                label: "Employee Database",
                href: "/database",
                roles: [UserRole.SDM, UserRole.SPECIALIST, UserRole.HR_HEAD],
                icon: <IconDatabase />,
            },
            {
                label: "Blacklist Registry",
                href: "/blacklist",
                roles: [UserRole.SPECIALIST, UserRole.HR_HEAD],
                icon: <IconBlacklist />,
            },
        ],
    },
    {
        label: "Reports",
        items: [
            {
                label: "Daily Report",
                href: "/reports",
                roles: [UserRole.SDM, UserRole.SPECIALIST, UserRole.HR_HEAD],
                icon: <IconReports />,
            },
        ],
    },
    {
        label: "Configuration",
        items: [
            {
                label: "Partners & Checks",
                href: "/partners",
                roles: [UserRole.HR_HEAD],
                icon: <IconPartners />,
            },
            {
                label: "User Management",
                href: "/settings/users",
                roles: [UserRole.HR_HEAD],
                icon: <IconUsers />,
            },
            {
                label: "Settings",
                href: "/settings",
                roles: [UserRole.HR_HEAD],
                icon: <IconSettings />,
            },
        ],
    },
];

interface Props {
    role: UserRole;
    userName: string;
    userEmail: string;
    userInitials: string;
    userImage?: string | null;
    pendingCount: number;
}

export default function Sidebar({
    role,
    userName,
    userImage,
    userInitials,
    pendingCount,
}: Props) {
    const pathname = usePathname();
    const [signingOut, setSigningOut] = useState(false);
    const [showSignOutModal, setShowSignOutModal] = useState(false);

    // Exact-match for dashboard and /settings (so /settings/users doesn't also
    // highlight the Settings row); prefix-match for everything else.
    const isActive = (href: string) => {
        if (href === "/dashboard" || href === "/settings") return pathname === href;
        return pathname === href || pathname.startsWith(href + "/");
    };

    const handleSignOutClick = () => {
        setShowSignOutModal(true);
    };

    const handleSignOutConfirm = async () => {
        setSigningOut(true);
        // Full sign-out in two parts:
        //   1. Clear NextAuth session cookies (our side)
        //   2. Fire Microsoft's logout endpoint in a hidden iframe to kill the
        //      Azure AD session silently. A top-level redirect to the logout
        //      endpoint would strand the user on Microsoft's "You signed out"
        //      page; the iframe avoids that while still clearing the cookie.
        // Then we navigate our app to /auth/signin ourselves.
        await signOut({ redirect: false });

        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = "https://login.microsoftonline.com/common/oauth2/v2.0/logout";

        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            try { document.body.removeChild(iframe); } catch { /* noop */ }
            window.location.href = "/auth/signin";
        };

        iframe.onload = finish;
        // Fallback in case onload doesn't fire (blocked cross-origin frame, etc.)
        setTimeout(finish, 1500);

        document.body.appendChild(iframe);
    };

    const handleSignOutCancel = () => {
        setShowSignOutModal(false);
    };

    return (
        <>
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <h2>OVATION WPS</h2>
                    <span>BGV Portal v1.0</span>
                </div>

                <nav className="sidebar-nav">
                    {SECTIONS.map((section) => {
                        const items = section.items.filter((i) => i.roles.includes(role));
                        if (!items.length) return null;
                        return (
                            <div key={section.label}>
                                <div className="nav-section">{section.label}</div>
                                {items.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`nav-item ${isActive(item.href) ? "active" : ""}`}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                        {item.href === "/requests" && pendingCount > 0 && (
                                            <div className="nav-badge">
                                                {pendingCount > 99 ? "99+" : pendingCount}
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        );
                    })}
                </nav>

                <div className="sidebar-user">
                    <div className="avatar">
                        {userImage ? (
                            <Image src={userImage} alt={userName} width={32} height={32} unoptimized />
                        ) : (
                            userInitials
                        )}
                    </div>
                    <div className="user-info">
                        <div className="uname">{userName}</div>
                        <div className="urole">{roleLabel(role)}</div>
                    </div>
                    <button
                        className="signout-btn"
                        onClick={handleSignOutClick}
                        disabled={signingOut}
                        title="Sign out"
                    >
                        <IconSignOut />
                    </button>
                </div>
            </aside>

            {/* Sign Out Confirmation Modal */}
            {showSignOutModal && (
                <SignOutModal
                    signingOut={signingOut}
                    onConfirm={handleSignOutConfirm}
                    onCancel={handleSignOutCancel}
                />
            )}
        </>
    );
}

// ─── Sign Out Modal ─────────────────────────────────────────────────────────
interface SignOutModalProps {
    signingOut: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

function SignOutModal({ signingOut, onConfirm, onCancel }: SignOutModalProps) {
    return (
        <div style={modalStyles.overlay} onClick={onCancel}>
            <div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
                <div style={modalStyles.icon}>
                    <IconLogoutWarning />
                </div>
                <h3 style={modalStyles.title}>Sign Out</h3>
                <p style={modalStyles.message}>
                    Are you sure you want to sign out of your account?
                </p>
                <div style={modalStyles.actions}>
                    <button
                        style={{
                            ...modalStyles.btn,
                            ...modalStyles.btnCancel,
                            ...(signingOut ? modalStyles.btnDisabled : {}),
                        }}
                        onClick={onCancel}
                        disabled={signingOut}
                    >
                        Cancel
                    </button>
                    <button
                        style={{
                            ...modalStyles.btn,
                            ...modalStyles.btnConfirm,
                            ...(signingOut ? modalStyles.btnDisabled : {}),
                        }}
                        onClick={onConfirm}
                        disabled={signingOut}
                    >
                        {signingOut ? (
                            <span style={modalStyles.loadingWrapper}>
                                <span style={modalStyles.spinner} className="signout-spinner" />
                                Signing out...
                            </span>
                        ) : (
                            "Sign Out"
                        )}
                    </button>
                </div>
            </div>

            {/* Keyframe animation for spinner - added via global style tag */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes signout-spin {
                        to { transform: rotate(360deg); }
                    }
                    .signout-spinner {
                        animation: signout-spin 0.8s linear infinite;
                    }
                `
            }} />
        </div>
    );
}

// ─── Modal Styles (inline to avoid hydration mismatch) ──────────────────────
const modalStyles: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
    },
    content: {
        background: "white",
        borderRadius: 12,
        padding: 24,
        maxWidth: 400,
        width: "90%",
        textAlign: "center",
        boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    },
    icon: {
        width: 48,
        height: 48,
        margin: "0 auto 16px",
        background: "#fef2f2",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#dc2626",
    },
    title: {
        fontSize: 18,
        fontWeight: 600,
        color: "#111827",
        margin: "0 0 8px",
    },
    message: {
        fontSize: 14,
        color: "#6b7280",
        margin: "0 0 24px",
        lineHeight: 1.5,
    },
    actions: {
        display: "flex",
        gap: 12,
        justifyContent: "center",
    },
    btn: {
        padding: "10px 20px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "none",
    },
    btnCancel: {
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
        color: "#374151",
    },
    btnConfirm: {
        background: "#dc2626",
        border: "1px solid #dc2626",
        color: "white",
    },
    btnDisabled: {
        opacity: 0.6,
        cursor: "not-allowed",
    },
    loadingWrapper: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
    },
    spinner: {
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid rgba(255, 255, 255, 0.3)",
        borderTopColor: "white",
        borderRadius: "50%",
    },
};

function roleLabel(role: UserRole) {
    return role === "HR_HEAD" ? "HR Head" : role === "SPECIALIST" ? "Specialist" : "SDM";
}

// ─── Icons ──────────────────────────────────────────────────────────────────
function IconDashboard() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    );
}
function IconRequests() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14,2 14,8 20,8" />
        </svg>
    );
}
function IconTracker() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
        </svg>
    );
}
function IconDatabase() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
    );
}
function IconBlacklist() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
    );
}
function IconReports() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}
function IconPartners() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
    );
}
function IconUsers() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
    );
}
function IconSettings() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
    );
}
function IconSignOut() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}
function IconLogoutWarning() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}