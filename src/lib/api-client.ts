// src/lib/api-client.ts
//
// Single client for all Django REST API calls. Every data-access function
// in the app should call through here instead of importing db.ts.
//
// Server-side (server components, server actions, API routes):
//   Calls Django at DJANGO_API_URL (default http://localhost:8000/api).
//   Passes the user's auth token for role-scoped data.
//
// Client-side (use client components):
//   Calls the Next.js proxy at /api/proxy/... which forwards to Django.
//   (Or call Django directly if CORS allows it.)

const DJANGO_URL = process.env.DJANGO_API_URL || "http://localhost:8000/api";

export interface ApiOptions {
    method?: string;
    body?: unknown;
    params?: Record<string, string | number | null | undefined>;
    /** User ID for server-side calls (from requireAuth). */
    userId?: string;
    /** Raw NextAuth JWT token for production auth. */
    token?: string;
    /** Content-Type override (default: application/json). */
    contentType?: string;
    /** For file uploads — pass FormData directly. */
    formData?: FormData;
    /** Return raw Response instead of parsed JSON. */
    raw?: boolean;
}

export class ApiError extends Error {
    constructor(
        public status: number,
        public body: unknown,
        message?: string
    ) {
        super(message || `API error ${status}`);
        this.name = "ApiError";
    }
}

/**
 * Call the Django backend. Returns parsed JSON by default.
 *
 * Usage:
 *   const data = await api<{ results: Request[] }>("/bgv/requests/", { userId });
 *   const detail = await api<RequestDetail>(`/bgv/requests/${id}/`, { userId });
 *   await api("/bgv/requests/", { method: "POST", body: payload, userId });
 */
export async function api<T = unknown>(
    path: string,
    opts: ApiOptions = {}
): Promise<T> {
    const url = new URL(`${DJANGO_URL}${path}`);

    // Append query params
    if (opts.params) {
        for (const [k, v] of Object.entries(opts.params)) {
            if (v !== null && v !== undefined && v !== "") {
                url.searchParams.set(k, String(v));
            }
        }
    }

    const headers: Record<string, string> = {};

    // Auth — dev mode uses X-User-Id, production uses Bearer token
    if (opts.token) {
        headers["Authorization"] = `Bearer ${opts.token}`;
    } else if (opts.userId) {
        headers["X-User-Id"] = opts.userId;
    }

    let fetchBody: BodyInit | undefined;
    if (opts.formData) {
        fetchBody = opts.formData;
        // Don't set Content-Type — browser/node sets multipart boundary
    } else if (opts.body !== undefined) {
        headers["Content-Type"] = opts.contentType || "application/json";
        fetchBody = JSON.stringify(opts.body);
    }

    const res = await fetch(url.toString(), {
        method: opts.method || (opts.body || opts.formData ? "POST" : "GET"),
        headers,
        body: fetchBody,
        cache: "no-store",
    });

    if (opts.raw) {
        return res as unknown as T;
    }

    if (!res.ok) {
        let errorBody: unknown;
        try {
            errorBody = await res.json();
        } catch {
            errorBody = await res.text().catch(() => "");
        }
        throw new ApiError(
            res.status,
            errorBody,
            typeof errorBody === "object" && errorBody && "error" in (errorBody as Record<string, unknown>)
                ? String((errorBody as Record<string, string>).error)
                : `API error ${res.status}`
        );
    }

    // Handle empty responses (204, etc.)
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
}

/** Paginated response shape from DRF. */
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
