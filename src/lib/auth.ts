// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { execute, queryOne } from "@/src/lib/db";
import { UserRole } from "@/src/lib/enums";
import { cuid } from "@/src/lib/ids";
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
         */
        async jwt({ token, account, profile }) {
            if (account && profile) {
                const azureAdId = token.sub!;
                const email = (token.email ?? "") as string;
                const name = (token.name ?? "") as string;
                const role = (token.role ?? UserRole.SDM) as UserRole;
                const image = (token.picture ?? null) as string | null;

                const existing = await queryOne<UserRow>(
                    "SELECT id, role, is_active FROM users WHERE azure_ad_id = ? LIMIT 1",
                    [azureAdId]
                );

                let userId: string;
                let userRole: UserRole;
                let isActive: boolean;

                if (existing) {
                    await execute(
                        `UPDATE users
                         SET email = ?, name = ?, image = ?
                         WHERE id = ?`,
                        [email, name, image, existing.id]
                    );
                    userId = existing.id;
                    userRole = existing.role;
                    isActive = Boolean(existing.is_active);
                } else {
                    const id = cuid();
                    await execute(
                        `INSERT INTO users (id, name, email, role, image, azure_ad_id, is_active)
                         VALUES (?, ?, ?, ?, ?, ?, 1)`,
                        [id, name, email, role, image, azureAdId]
                    );
                    userId = id;
                    userRole = role;
                    isActive = true;
                }

                if (!isActive) throw new Error("AccountDisabled");

                token.dbUserId = userId;
                token.role = userRole;
                token.azureAdId = azureAdId;
                token.accessToken = account.access_token;
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
        error: "/auth/error",
    },

    session: {
        strategy: "jwt",
        maxAge: 8 * 60 * 60, // 8 hours
    },

    events: {
        async signIn({ user }) {
            console.info(`[AUTH] Sign-in: ${user.email} at ${new Date().toISOString()}`);
        },
        async signOut({ token }) {
            console.info(`[AUTH] Sign-out: ${token?.email} at ${new Date().toISOString()}`);
        },
    },

    secret: process.env.NEXTAUTH_SECRET,
};
