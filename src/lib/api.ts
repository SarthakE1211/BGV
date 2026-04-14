// Shared helpers for API route handlers. Pairs with src/lib/errors.ts —
// these only cover the happy path; uncaught throws in your handler get
// translated by toApiResponse() in the route's catch block.

import type { NextRequest } from "next/server";
import type { ZodTypeAny, z } from "zod";
import { AppError } from "@/src/lib/errors";

/** Parse and validate a JSON request body against a Zod schema.
 *  Respects `.default()` and transforms — the returned type is `z.output<S>`. */
export async function parseBody<S extends ZodTypeAny>(
    req: Request | NextRequest,
    schema: S
): Promise<z.output<S>> {
    let raw: unknown;
    try {
        raw = await req.json();
    } catch {
        throw new AppError("VALIDATION", "Request body is not valid JSON");
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new AppError("VALIDATION", first?.message ?? "Invalid input", {
            field: first?.path.join(".") || undefined,
            details: parsed.error.issues,
        });
    }
    return parsed.data;
}

/** Parse and validate query-string params against a Zod schema. */
export function parseQuery<S extends ZodTypeAny>(
    req: Request | NextRequest,
    schema: S
): z.output<S> {
    const url = new URL(req.url);
    const obj = Object.fromEntries(url.searchParams.entries());
    const parsed = schema.safeParse(obj);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new AppError("VALIDATION", first?.message ?? "Invalid query", {
            field: first?.path.join(".") || undefined,
            details: parsed.error.issues,
        });
    }
    return parsed.data;
}
