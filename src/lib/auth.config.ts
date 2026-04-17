// Shared auth/role configuration.
// Imported by middleware.ts (edge) and src/lib/auth.helpers.ts (server).
// Keep this file free of server-only imports (no db, no next/headers) so
// the edge runtime can use it.

import { UserRole } from "@/src/lib/enums";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.SDM]: 0,
    [UserRole.SPECIALIST]: 1,
    [UserRole.HR_HEAD]: 2,
};

export function meetsRole(userRole: UserRole, required: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

// Path prefixes → minimum role required. Order doesn't matter; each prefix
// is independent. Add new protected routes here instead of editing middleware.
export const ROUTE_ROLE_GUARDS: ReadonlyArray<{ prefix: string; minRole: UserRole }> = [
    { prefix: "/partners", minRole: UserRole.HR_HEAD },
    { prefix: "/settings", minRole: UserRole.HR_HEAD },
    { prefix: "/blacklist", minRole: UserRole.SPECIALIST },
    { prefix: "/tracker", minRole: UserRole.SPECIALIST },
];
