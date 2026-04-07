// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
    // Prevent multiple Prisma instances during Next.js hot-reload in dev
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
    global.__prisma ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === "development"
                ? ["query", "warn", "error"]
                : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    global.__prisma = prisma;
}