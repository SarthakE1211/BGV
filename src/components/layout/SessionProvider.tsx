// src/components/layout/SessionProvider.tsx
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

/**
 * Wraps the app in NextAuth's SessionProvider.
 * Must be a client component — placed in a thin wrapper so
 * the root layout can remain a server component.
 */
export function SessionProvider({
    children,
    session,
}: {
    children: React.ReactNode;
    session: Session | null;
}) {
    return (
        <NextAuthSessionProvider session={session}>
            {children}
        </NextAuthSessionProvider>
    );
}