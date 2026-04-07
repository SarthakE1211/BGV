// src/types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            /** Prisma User.id (UUID) */
            id: string;
            /** Azure AD Object ID — used for upsert */
            azureAdId: string;
            /** BGV Portal role: SDM | SPECIALIST | HR_HEAD */
            role: UserRole;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        dbUserId?: string;
        azureAdId?: string;
        role?: UserRole;
        accessToken?: string;
    }
}