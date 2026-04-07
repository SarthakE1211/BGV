// src/lib/auth.helpers.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { UserRole } from "@prisma/client";

const ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.SDM]: 0,
    [UserRole.SPECIALIST]: 1,
    [UserRole.HR_HEAD]: 2,
};

/**
 * Call at the top of any server component or server action.
 *
 * Returns the full Prisma User record.
 * Redirects to sign-in if unauthenticated.
 * Redirects to /unauthorized if role is insufficient.
 *
 * Usage:
 *   const user = await requireAuth();                    // any authenticated role
 *   const user = await requireAuth(UserRole.HR_HEAD);   // HR_HEAD only
 */
export async function requireAuth(minRole?: UserRole) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/api/auth/signin");
    }

    // Fetch fresh user from DB (includes latest role, isActive flag)
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user || !user.isActive) {
        redirect("/auth/error?error=AccountDisabled");
    }

    if (minRole && ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[minRole]) {
        redirect("/unauthorized");
    }

    return user;
}

/**
 * Lightweight version — only reads the JWT (no DB call).
 * Use for non-sensitive UI decisions (show/hide nav items).
 */
export async function getSessionUser() {
    const session = await getServerSession(authOptions);
    return session?.user ?? null;
}

/**
 * Role comparison utility (also useful in server components).
 */
export function hasRole(userRole: UserRole, required: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}