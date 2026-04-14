// Typed error class + adapters so every layer speaks one error shape.
//
//   Service layer:  throw new AppError("NOT_FOUND", "...", 404)
//   API route:      catch(e) { return toApiResponse(e); }
//   Server action:  catch(e) { return toActionResult(e); }
//
// Unknown errors are coerced to { code: "INTERNAL", status: 500 } and the
// original error is logged — never leaked to the client.

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/src/lib/logger";

export type ErrorCode =
    | "VALIDATION"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "BLACKLISTED"
    | "INTERNAL";

const DEFAULT_STATUS: Record<ErrorCode, number> = {
    VALIDATION: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    BLACKLISTED: 422,
    INTERNAL: 500,
};

export class AppError extends Error {
    readonly code: ErrorCode;
    readonly status: number;
    readonly field?: string;
    readonly details?: unknown;

    constructor(
        code: ErrorCode,
        message: string,
        opts: { status?: number; field?: string; details?: unknown; cause?: unknown } = {}
    ) {
        super(message);
        this.name = "AppError";
        this.code = code;
        this.status = opts.status ?? DEFAULT_STATUS[code];
        this.field = opts.field;
        this.details = opts.details;
        if (opts.cause !== undefined) (this as { cause?: unknown }).cause = opts.cause;
    }
}

export interface ErrorBody {
    error: {
        code: ErrorCode;
        message: string;
        field?: string;
        details?: unknown;
    };
}

function toErrorBody(e: unknown): { body: ErrorBody; status: number } {
    if (e instanceof AppError) {
        return {
            status: e.status,
            body: {
                error: {
                    code: e.code,
                    message: e.message,
                    ...(e.field ? { field: e.field } : {}),
                    ...(e.details !== undefined ? { details: e.details } : {}),
                },
            },
        };
    }
    if (e instanceof ZodError) {
        const first = e.issues[0];
        return {
            status: 400,
            body: {
                error: {
                    code: "VALIDATION",
                    message: first?.message ?? "Invalid input",
                    field: first?.path.join(".") || undefined,
                    details: e.issues,
                },
            },
        };
    }
    logger.error("unhandled error", { err: e });
    return {
        status: 500,
        body: { error: { code: "INTERNAL", message: "Unexpected error" } },
    };
}

/** API route adapter — returns a NextResponse. */
export function toApiResponse(e: unknown): NextResponse {
    const { body, status } = toErrorBody(e);
    return NextResponse.json(body, { status });
}

/** Server action adapter — returns the existing {ok:false,error,field} shape. */
export function toActionResult(e: unknown): {
    ok: false;
    error: string;
    code: ErrorCode;
    field?: string;
} {
    const { body } = toErrorBody(e);
    return {
        ok: false,
        error: body.error.message,
        code: body.error.code,
        ...(body.error.field ? { field: body.error.field } : {}),
    };
}
