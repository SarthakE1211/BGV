// src/types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@/src/lib/enums";

declare module "next-auth" {
    interface Session {
        user: {
            /** users.id from MySQL (cuid-style string) */
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