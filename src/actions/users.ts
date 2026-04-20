"use server";

// User Management actions — HR Head only.
//
// Pre-provisioning model: HR Head enters a company email + role before the
// user ever logs in. On first successful sign-in, auth.ts backfills the
// Azure AD id, name, and image. We never delete users (FK references in
// bgv_requests / activity_logs); we toggle is_active instead.

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/src/lib/auth.helpers";
import { api, ApiError } from "@/src/lib/api-client";
import { UserRole } from "@/src/lib/enums";
import type { ErrorCode } from "@/src/lib/errors";

export interface ManagedUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    hasLoggedIn: boolean;
    createdAt: string;
}

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string; code?: ErrorCode; field?: string };

const RoleSchema = z.enum([UserRole.SDM, UserRole.SPECIALIST, UserRole.HR_HEAD]);

const AddUserSchema = z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid company email"),
    role: RoleSchema,
});

const UpdateRoleSchema = z.object({
    userId: z.string().min(1),
    role: RoleSchema,
});

const SetActiveSchema = z.object({
    userId: z.string().min(1),
    isActive: z.boolean(),
});

function invalidate() {
    revalidatePath("/settings");
    revalidatePath("/settings/users");
}

/** HR Head only. Returns all users (active + inactive). */
export async function listUsers(): Promise<ManagedUser[]> {
    const user = await requireAuth(UserRole.HR_HEAD);

    try {
        // Django returns paginated { count, results: [...] } with snake_case
        const data = await api<{
            count?: number;
            results?: Array<Record<string, unknown>>;
        } | Array<Record<string, unknown>>>("/users/", {
            userId: user.id,
            params: { page_size: 200 },
        });

        const rows = Array.isArray(data) ? data : (data.results ?? []);
        return rows.map((r) => ({
            id: String(r.id ?? ""),
            name: String(r.name ?? ""),
            email: String(r.email ?? ""),
            role: (r.role ?? "SDM") as UserRole,
            isActive: Boolean(r.is_active ?? r.isActive ?? true),
            hasLoggedIn: Boolean(r.azure_ad_id ?? r.azureAdId ?? r.has_logged_in ?? r.hasLoggedIn ?? false),
            createdAt: String(r.created_at ?? r.createdAt ?? ""),
        }));
    } catch (e) {
        if (e instanceof ApiError) {
            throw new Error(e.message);
        }
        throw e;
    }
}

export async function addUser(input: {
    email: string;
    role: UserRole;
}): Promise<Ok<{ userId: string }> | Fail> {
    const user = await requireAuth(UserRole.HR_HEAD);

    const parsed = AddUserSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };
    }
    const { email, role } = parsed.data;

    try {
        const result = await api<{ id: string }>("/users/", {
            method: "POST",
            body: { name: email.split("@")[0], email, role },
            userId: user.id,
        });

        invalidate();
        return { ok: true, userId: result.id };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
            const msg = (body?.error as string) || e.message;
            const code: ErrorCode =
                e.status === 409 ? "CONFLICT" :
                e.status === 400 ? "VALIDATION" :
                "INTERNAL";
            return { ok: false, error: msg, code, ...(e.status === 409 ? { field: "email" } : {}) };
        }
        return { ok: false, error: "Unexpected error" };
    }
}

export async function updateUserRole(input: {
    userId: string;
    role: UserRole;
}): Promise<Ok<object> | Fail> {
    const user = await requireAuth(UserRole.HR_HEAD);

    const parsed = UpdateRoleSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };
    }
    const { userId, role } = parsed.data;

    try {
        await api(`/users/${userId}/role/`, {
            method: "PATCH",
            body: { role },
            userId: user.id,
        });

        invalidate();
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
            const msg = (body?.error as string) || e.message;
            const code: ErrorCode =
                e.status === 403 ? "FORBIDDEN" :
                e.status === 404 ? "NOT_FOUND" :
                e.status === 409 ? "CONFLICT" :
                "INTERNAL";
            return { ok: false, error: msg, code };
        }
        return { ok: false, error: "Unexpected error" };
    }
}

export async function setUserActive(input: {
    userId: string;
    isActive: boolean;
}): Promise<Ok<object> | Fail> {
    const user = await requireAuth(UserRole.HR_HEAD);

    const parsed = SetActiveSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };
    }
    const { userId, isActive } = parsed.data;

    try {
        await api(`/users/${userId}/active/`, {
            method: "PATCH",
            body: { is_active: isActive },
            userId: user.id,
        });

        invalidate();
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
            const msg = (body?.error as string) || e.message;
            const code: ErrorCode =
                e.status === 403 ? "FORBIDDEN" :
                e.status === 404 ? "NOT_FOUND" :
                e.status === 409 ? "CONFLICT" :
                "INTERNAL";
            return { ok: false, error: msg, code };
        }
        return { ok: false, error: "Unexpected error" };
    }
}
