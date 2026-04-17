// src/lib/auth.helpers.ts
import { cache } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import { queryOne } from "@/src/lib/db";
import { UserRole } from "@/src/lib/enums";
import { ROLE_HIERARCHY, meetsRole } from "@/src/lib/auth.config";
import type { UserRow } from "@/src/lib/types";

export interface AuthedUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    image: string | null;
    isActive: boolean;
}

// React's cache() dedupes within a single request so layout + page + nested
// server components that each call requireAuth() share one DB round-trip.
const loadAuthedUser = cache(async (sessionUserId: string): Promise<UserRow | null> => {
    return queryOne<UserRow>(
        `SELECT id, name, email, role, image, is_active
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [sessionUserId]
    );
});

/**
 * Use at the top of any server component or server action.
 * Redirects to sign-in if unauthenticated; to /unauthorized if role is too low.
 */
export async function requireAuth(minRole?: UserRole): Promise<AuthedUser> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/api/auth/signin");
    }

    const row = await loadAuthedUser(session.user.id);

    if (!row || !row.is_active) {
        redirect("/auth/signin?error=AccountDisabled");
    }

    if (minRole && ROLE_HIERARCHY[row.role] < ROLE_HIERARCHY[minRole]) {
        redirect("/unauthorized");
    }

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        image: row.image,
        isActive: Boolean(row.is_active),
    };
}

/** Lightweight JWT-only read — no DB call. Use for non-sensitive UI checks. */
export async function getSessionUser() {
    const session = await getServerSession(authOptions);
    return session?.user ?? null;
}

// Backwards-compatible alias for meetsRole (finding #1 consolidation).
export { meetsRole as hasRole };
