// src/lib/enums.ts
//
// Local, hand-rolled enums that mirror the MySQL ENUM columns in db/schema.sql.
// These replace the `@prisma/client` enum exports we used to import.
//
// Kept as plain `as const` objects so they work as both values *and* types,
// and are tree-shakable (no TypeScript enum runtime bloat).

export const UserRole = {
    SDM: "SDM",
    SPECIALIST: "SPECIALIST",
    HR_HEAD: "HR_HEAD",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const BGVStatus = {
    PENDING: "PENDING",
    IN_PROGRESS: "IN_PROGRESS",
    GREEN: "GREEN",
    AMBER: "AMBER",
    RED_FLAG: "RED_FLAG",
    BLACKLISTED: "BLACKLISTED",
} as const;
export type BGVStatus = (typeof BGVStatus)[keyof typeof BGVStatus];

export const CheckStatus = {
    PENDING: "PENDING",
    IN_PROGRESS: "IN_PROGRESS",
    CLEARED: "CLEARED",
    FAILED: "FAILED",
} as const;
export type CheckStatus = (typeof CheckStatus)[keyof typeof CheckStatus];

export const RoleType = {
    FTE_W2: "FTE_W2",
    PRO: "PRO",
    DISPATCH: "DISPATCH",
    BACKFILL: "BACKFILL",
} as const;
export type RoleType = (typeof RoleType)[keyof typeof RoleType];

export const Region = {
    USA: "USA",
    CANADA: "CANADA",
    LATAM: "LATAM",
} as const;
export type Region = (typeof Region)[keyof typeof Region];

export const BGVVendor = {
    DISA: "DISA",
    PRECISEHIRE: "PRECISEHIRE",
} as const;
export type BGVVendor = (typeof BGVVendor)[keyof typeof BGVVendor];

export const Priority = {
    NORMAL: "NORMAL",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];
