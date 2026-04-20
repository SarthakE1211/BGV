// src/lib/auth.ts
//
// NextAuth configuration. User lookups now go through Django API —
// no direct SQL. If Django is down, sign-in fails gracefully.

import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import type { UserRole } from "@/src/lib/enums";
import { logger } from "@/src/lib/logger";

const DJANGO_URL = process.env.DJANGO_API_URL || "http://localhost:8000/api";

type AzureProfileExtras = {
    email?: string | null;
    preferred_username?: string | null;
    oid?: string | null;
    sub?: string | null;
    name?: string | null;
    picture?: string | null;
};

/** Call Django API from NextAuth callbacks (no api-client import to avoid
 *  circular deps — this is a standalone fetch). */
async function djangoFetch<T>(path: string, opts: RequestInit = {}): Promise<T | null> {
    try {
        const res = await fetch(`${DJANGO_URL}${path}`, {
            ...opts,
            headers: {
                "Content-Type": "application/json",
                ...opts.headers,
            },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
            authorization: {
                params: {
                    scope: "openid profile email offline_access User.Read",
                    prompt: "select_account",
                },
            },
        }),
    ],

    callbacks: {
        async signIn({ user, profile }) {
            const p = (profile ?? {}) as AzureProfileExtras;
            const email = (user?.email ?? p.email ?? p.preferred_username ?? "")
                .toString()
                .trim()
                .toLowerCase();

            if (!email) return "/auth/signin?error=MissingEmail";

            try {
                // Unauthenticated lookup — no auth needed during sign-in
                const userRow = await djangoFetch<{
                    found: boolean;
                    id: string;
                    role: string;
                    is_active: boolean;
                    azure_ad_id: string | null;
                    name: string;
                }>(`/users/auth-lookup/?email=${encodeURIComponent(email)}`);

                if (!userRow || !userRow.found) return "/auth/access-pending";
                if (!userRow.is_active) return "/auth/signin?error=AccountDisabled";

                // Check SSO toggle — settings endpoint is also unauthenticated-safe
                // since it just reads flags. If it fails, allow login (fail-open).
                try {
                    const settings = await djangoFetch<Array<{ key: string; value: string }>>("/settings/");
                    if (settings && Array.isArray(settings)) {
                        const ssoSetting = settings.find((s) => s.key === "m365.sso_login");
                        if (ssoSetting && ssoSetting.value === "0" && userRow.role !== "HR_HEAD") {
                            logger.info("auth.signIn blocked by m365.sso_login toggle", { email });
                            return "/auth/signin?error=SsoDisabled";
                        }
                    }
                } catch {
                    // Settings check failed — fail-open, allow login
                }

                // Backfill azure_ad_id / name / image via the same unauthenticated endpoint
                const azureAdId = (user?.id ?? p.oid ?? p.sub ?? null) as string | null;
                const name = (user?.name ?? p.name ?? "") as string;
                const image = (user?.image ?? p.picture ?? null) as string | null;

                if (azureAdId && azureAdId !== userRow.azure_ad_id) {
                    await djangoFetch(`/users/auth-lookup/?email=${encodeURIComponent(email)}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                            email,
                            azure_ad_id: azureAdId,
                            name: name || undefined,
                            image: image || undefined,
                        }),
                    });
                }

                return true;
            } catch (err) {
                logger.error("auth.signIn lookup failed", { err, email });
                return "/auth/signin?error=Default";
            }
        },

        async jwt({ token, account, profile }) {
            if (account && profile) {
                const p = profile as AzureProfileExtras;
                const email = (token.email ?? p.email ?? p.preferred_username ?? "")
                    .toString()
                    .trim()
                    .toLowerCase();

                try {
                    // Unauthenticated lookup for JWT claims
                    const userRow = await djangoFetch<{
                        found: boolean;
                        id: string;
                        role: UserRole;
                    }>(`/users/auth-lookup/?email=${encodeURIComponent(email)}`);

                    if (userRow && userRow.found) {
                        token.dbUserId = userRow.id;
                        token.role = userRow.role;
                    }
                    token.azureAdId = token.sub;
                    token.accessToken = account.access_token;
                } catch (err) {
                    logger.error("auth.jwt lookup failed", { err, email });
                    if (!token.dbUserId || !token.role) throw err;
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.dbUserId as string;
                session.user.role = token.role as UserRole;
                session.user.azureAdId = token.azureAdId as string;
            }
            return session;
        },
    },

    pages: {
        signIn: "/auth/signin",
        error: "/auth/signin",
    },

    session: {
        strategy: "jwt",
        maxAge: 8 * 60 * 60, // 8 hours
    },

    events: {
        async signIn({ user }) {
            logger.info("auth.signIn", { email: user.email });
        },
        async signOut({ token }) {
            logger.info("auth.signOut", { email: token?.email });
        },
    },

    secret: process.env.NEXTAUTH_SECRET,
};
