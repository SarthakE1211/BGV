// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { execute, queryOne } from "@/src/lib/db";
import { UserRole } from "@/src/lib/enums";
import { cuid } from "@/src/lib/ids";
import { logger } from "@/src/lib/logger";
import type { UserRow } from "@/src/lib/types";

export const authOptions: NextAuthOptions = {
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
            authorization: {
                params: {
                    scope: "openid profile email offline_access User.Read",
                },
            },
        }),
    ],

    callbacks: {
        /**
         * Runs after Azure AD returns tokens.
         * Upserts the user row via raw SQL keyed on azure_ad_id.
         *
         * If the DB is unavailable we log and fall back to any prior claims
         * already on the token — this keeps signed-in users working through
         * a transient DB outage instead of locking everyone out at refresh.
         */
        async jwt({ token, account, profile }) {
            if (!account || !profile) return token;

            const azureAdId = token.sub!;
            const email = (token.email ?? "") as string;
            const name = (token.name ?? "") as string;
            const incomingRole = (token.role ?? UserRole.SDM) as UserRole;
            const image = (token.picture ?? null) as string | null;

            try {
                const existing = await queryOne<UserRow>(
                    "SELECT id, role, is_active FROM users WHERE azure_ad_id = ? LIMIT 1",
                    [azureAdId]
                );

                if (existing) {
                    if (!existing.is_active) throw new Error("AccountDisabled");
                    await execute(
                        `UPDATE users SET email = ?, name = ?, image = ? WHERE id = ?`,
                        [email, name, image, existing.id]
                    );
                    token.dbUserId = existing.id;
                    token.role = existing.role;
                } else {
                    const id = cuid();
                    await execute(
                        `INSERT INTO users (id, name, email, role, image, azure_ad_id, is_active)
                         VALUES (?, ?, ?, ?, ?, ?, 1)`,
                        [id, name, email, incomingRole, image, azureAdId]
                    );
                    token.dbUserId = id;
                    token.role = incomingRole;
                }

                token.azureAdId = azureAdId;
                token.accessToken = account.access_token;
                return token;
            } catch (err) {
                // Explicit account-disabled rejection must still fail hard.
                if (err instanceof Error && err.message === "AccountDisabled") throw err;

                // Transient DB failure: keep prior claims if we have them so
                // the user isn't logged out; otherwise bubble up.
                logger.error("auth.jwt upsert failed", { err, azureAdId, email });
                if (token.dbUserId && token.role) return token;
                throw err;
            }
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
        error: "/auth/error",
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
