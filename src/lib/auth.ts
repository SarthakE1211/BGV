// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { execute, queryOne } from "@/src/lib/db";
import type { UserRole } from "@/src/lib/enums";
import { logger } from "@/src/lib/logger";
import type { UserRow } from "@/src/lib/types";
import { getSetting } from "@/src/lib/settings";

type AzureProfileExtras = {
    email?: string | null;
    preferred_username?: string | null;
    oid?: string | null;
    sub?: string | null;
    name?: string | null;
    picture?: string | null;
};

export const authOptions: NextAuthOptions = {
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
            authorization: {
                params: {
                    scope: "openid profile email offline_access User.Read",
                    // Force Microsoft to show the account picker / credential prompt
                    // every time. Without this, Azure AD silently re-authenticates
                    // the cached account after signout — the user never gets a chance
                    // to switch accounts or enter fresh credentials.
                    prompt: "select_account",
                },
            },
        }),
    ],

    callbacks: {
        /**
         * Gate sign-in: users must already exist in the `users` table
         * (pre-provisioned by HR Head). Unknown emails land on the public
         * "Access Pending" page; disabled accounts are rejected.
         *
         * On first successful login we backfill azure_ad_id / name / image
         * from the Azure AD profile (HR Head only entered the email).
         */
        async signIn({ user, profile }) {
            const p = (profile ?? {}) as AzureProfileExtras;
            const email = (user?.email ?? p.email ?? p.preferred_username ?? "")
                .toString()
                .trim()
                .toLowerCase();

            if (!email) return "/auth/signin?error=MissingEmail";

            try {
                const existing = await queryOne<UserRow>(
                    `SELECT id, name, email, role, image, azure_ad_id, is_active
                     FROM users WHERE email = ? LIMIT 1`,
                    [email]
                );

                if (!existing) return "/auth/access-pending";
                if (!existing.is_active) return "/auth/signin?error=AccountDisabled";

                // Respect the /settings "M365 SSO Login" toggle. HR_HEAD is
                // always allowed through — otherwise turning the toggle off
                // would lock out the only role that can turn it back on.
                const ssoEnabled = await getSetting("m365.sso_login").catch(() => true);
                if (!ssoEnabled && existing.role !== "HR_HEAD") {
                    logger.info("auth.signIn blocked by m365.sso_login toggle", { email });
                    return "/auth/signin?error=SsoDisabled";
                }

                const azureAdId = (user?.id ?? p.oid ?? p.sub ?? null) as string | null;
                const name = (user?.name ?? p.name ?? existing.name) as string;
                const image = (user?.image ?? p.picture ?? existing.image) as string | null;

                const needsBackfill =
                    existing.azure_ad_id !== azureAdId ||
                    existing.name !== name ||
                    (existing.image ?? null) !== (image ?? null);

                if (needsBackfill) {
                    await execute(
                        `UPDATE users SET azure_ad_id = ?, name = ?, image = ? WHERE id = ?`,
                        [azureAdId ?? existing.azure_ad_id, name, image, existing.id]
                    );
                }

                return true;
            } catch (err) {
                logger.error("auth.signIn lookup failed", { err, email });
                return "/auth/signin?error=Default";
            }
        },

        /**
         * Runs on every request. On first sign-in (account + profile present),
         * copy id + role from DB onto the JWT. Subsequent calls just pass through.
         *
         * Transient DB failure: keep prior claims if we have them so the user
         * isn't logged out; only fail hard when we have nothing to fall back on.
         */
        async jwt({ token, account, profile }) {
            if (account && profile) {
                const p = profile as AzureProfileExtras;
                const email = (token.email ?? p.email ?? p.preferred_username ?? "")
                    .toString()
                    .trim()
                    .toLowerCase();

                try {
                    const row = await queryOne<{ id: string; role: UserRole }>(
                        "SELECT id, role FROM users WHERE email = ? LIMIT 1",
                        [email]
                    );
                    if (row) {
                        token.dbUserId = row.id;
                        token.role = row.role;
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
            console.log("session",session);
            console.log("token",token);
            
            
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
