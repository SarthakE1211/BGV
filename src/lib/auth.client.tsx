// src/lib/auth.client.tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@/src/lib/enums";

const ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.SDM]: 0,
    [UserRole.SPECIALIST]: 1,
    [UserRole.HR_HEAD]: 2,
};

export function hasRole(userRole: UserRole, required: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

// ─────────────────────────────────────────────────────────────────────────────
// useAuth — drop-in hook for client components
// ─────────────────────────────────────────────────────────────────────────────
export function useAuth() {
    const { data: session, status } = useSession();

    return {
        user: session?.user ?? null,
        role: (session?.user?.role ?? UserRole.SDM) as UserRole,
        isLoading: status === "loading",
        isAuthenticated: status === "authenticated",
        isSDM: session?.user?.role === UserRole.SDM,
        isSpecialist: session?.user?.role === UserRole.SPECIALIST,
        isHRHead: session?.user?.role === UserRole.HR_HEAD,
        signIn: () => signIn("azure-ad"),
        signOut: () => signOut({ callbackUrl: "/" }),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// useRequireAuth — client-side redirect guard
// ─────────────────────────────────────────────────────────────────────────────
export function useRequireAuth(minRole?: UserRole) {
    const { user, role, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            signIn("azure-ad");
            return;
        }
        if (minRole && !hasRole(role, minRole)) {
            router.replace("/unauthorized");
        }
    }, [isLoading, isAuthenticated, role, minRole, router]);

    return { user, role, isLoading };
}

// ─────────────────────────────────────────────────────────────────────────────
// RoleGuard — component wrapper for role-filtered UI
// ─────────────────────────────────────────────────────────────────────────────
interface RoleGuardProps {
    /** Minimum role required to render children */
    minRole: UserRole;
    children: React.ReactNode;
    /** Optional fallback content shown when role is insufficient */
    fallback?: React.ReactNode;
}

/**
 * Usage:
 *   <RoleGuard minRole={UserRole.HR_HEAD}>
 *     <BlacklistButton />
 *   </RoleGuard>
 *
 *   <RoleGuard minRole={UserRole.SPECIALIST} fallback={<p>Access restricted</p>}>
 *     <ReportsPanel />
 *   </RoleGuard>
 */
export function RoleGuard({ minRole, children, fallback = null }: RoleGuardProps) {
    const { role, isLoading } = useAuth();
    if (isLoading) return null;
    return hasRole(role, minRole) ? <>{children}</> : <>{fallback}</>;
}