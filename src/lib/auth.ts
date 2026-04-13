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
            console.log("token", token, account, profile);

            if (account && profile) {
                console.log("account & profile undefined");

                const azureAdId = token.sub!;
                const email = token.email ?? "";
                const name = token.name ?? "";
                const role = token.role ?? "SDM";
                const image = token.picture ?? null;

                // Find or create user by azureAdId (Prisma upsert)
                const user = await prisma.user.upsert({
                    where: { azureAdId },
                    create: {
                        azureAdId,
                        email,
                        name,
                        role,
                        image,
                        isActive: true,
                    },
                    update: {
                        // Keep email/name in sync with Azure AD profile
                        email,
                        name,
                        image
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
            console.log("session", session, token);

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