// src/lib/auth.helpers.ts
//
// All user validation now goes through Django API — no direct SQL.
// If Django is down, requireAuth throws and the page shows an error.

import { cache } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import { api } from "@/src/lib/api-client";
import { UserRole } from "@/src/lib/enums";
import { ROLE_HIERARCHY, meetsRole } from "@/src/lib/auth.config";

export interface AuthedUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    image: string | null;
    isActive: boolean;
}

// React's cache() dedupes within a single request so layout + page + nested
// server components that each call requireAuth() share one API round-trip.
const loadAuthedUser = cache(async (sessionUserId: string): Promise<AuthedUser | null> => {
    try {
        const user = await api<{
            id: string;
            name: string;
            email: string;
            role: UserRole;
            image?: string | null;
            is_active?: boolean;
            isActive?: boolean;
        }>("/users/me/", { userId: sessionUserId });

        if (!user || !user.id) return null;

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image ?? null,
            isActive: Boolean(user.is_active ?? user.isActive ?? true),
        };
    } catch {
        return null;
    }
});

/**
 * Use at the top of any server component or server action.
 * Redirects to sign-in if unauthenticated; to /unauthorized if role is too low.
 * If Django backend is down, this will fail and the page shows an error.
 */
export async function requireAuth(minRole?: UserRole): Promise<AuthedUser> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/api/auth/signin");
    }

    const user = await loadAuthedUser(session.user.id);

    if (!user || !user.isActive) {
        redirect("/auth/signin?error=AccountDisabled");
    }

    if (minRole && ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[minRole]) {
        redirect("/unauthorized");
    }

    return user;
}

/** Lightweight JWT-only read — no DB/API call. Use for non-sensitive UI checks. */
export async function getSessionUser() {
    const session = await getServerSession(authOptions);
    return session?.user ?? null;
}

// Backwards-compatible alias for meetsRole.
export { meetsRole as hasRole };
