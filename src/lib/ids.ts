// src/lib/ids.ts
//
// Lightweight id generator — 25-char collision-resistant string, URL-safe.
// Used in place of cuid() from Prisma. Not cryptographically unique by
// itself, but "good enough for PKs" (36^25 space, plus a process counter).

import { randomBytes } from "node:crypto";

let counter = 0;

export function cuid(): string {
    counter = (counter + 1) & 0xffffff;
    const ts = Date.now().toString(36);
    const ctr = counter.toString(36).padStart(4, "0");
    const rnd = randomBytes(6).toString("hex");
    return `c${ts}${ctr}${rnd}`.slice(0, 25);
}

/** Generate a request number: BGV-YYYY-NNNN (padded by caller-supplied count). */
export function requestNumber(year: number, seq: number): string {
    return `BGV-${year}-${String(seq).padStart(4, "0")}`;
}
