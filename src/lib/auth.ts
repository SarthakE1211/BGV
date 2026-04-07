// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { prisma } from "@/src/lib/prisma";
import { UserRole } from "@prisma/client";

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
         * Upserts the user in PostgreSQL via Prisma using azureAdId.
         * Attaches role + dbUserId to the JWT.
         */
        async jwt({ token, account, profile }) {
            if (account && profile) {
                const azureAdId = token.sub!;
                const email = token.email ?? "";
                const name = token.name ?? "";

                // Find or create user by azureAdId (Prisma upsert)
                const user = await prisma.user.upsert({
                    where: { azureAdId },
                    create: {
                        azureAdId,
                        email,
                        name,
                        // Default role for new users — change as needed
                        role: UserRole.SDM,
                        isActive: true,
                    },
                    update: {
                        // Keep email/name in sync with Azure AD profile
                        email,
                        name,
                    },
                    select: {
                        id: true,
                        role: true,
                        isActive: true,
                    },
                });

                // Block inactive users
                if (!user.isActive) {
                    throw new Error("AccountDisabled");
                }

                token.dbUserId = user.id;
                token.role = user.role;
                token.azureAdId = azureAdId;
                token.accessToken = account.access_token;
            }
            return token;
        },

        /**
         * Exposes role and user id on the client-accessible session object.
         */
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
        /**
         * Log sign-in activity — useful for audit trails in this BGV context.
         */
        async signIn({ user }) {
            console.info(`[AUTH] Sign-in: ${user.email} at ${new Date().toISOString()}`);
        },
        async signOut({ token }) {
            console.info(`[AUTH] Sign-out: ${token?.email} at ${new Date().toISOString()}`);
        },
    },

    secret: process.env.NEXTAUTH_SECRET,
};