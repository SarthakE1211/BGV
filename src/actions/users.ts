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
import { execute, query, queryOne } from "@/src/lib/db";
import { UserRole } from "@/src/lib/enums";
import { AppError, toActionResult, type ErrorCode } from "@/src/lib/errors";
import { cuid } from "@/src/lib/ids";
import { logger } from "@/src/lib/logger";
import type { UserRow } from "@/src/lib/types";

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
    await requireAuth(UserRole.HR_HEAD);

    const rows = await query<UserRow>(
        `SELECT id, name, email, role, image, azure_ad_id, is_active, created_at
         FROM users
         ORDER BY is_active DESC, role, name`
    );

    return rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        isActive: Boolean(r.is_active),
        hasLoggedIn: Boolean(r.azure_ad_id),
        createdAt: (r.created_at instanceof Date
            ? r.created_at.toISOString()
            : String(r.created_at)) as string,
    }));
}

export async function addUser(input: {
    email: string;
    role: UserRole;
}): Promise<Ok<{ userId: string }> | Fail> {
    const actor = await requireAuth(UserRole.HR_HEAD);

    const parsed = AddUserSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };
    }
    const { email, role } = parsed.data;

    try {
        const existing = await queryOne<{ id: string }>(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email]
        );
        if (existing) {
            throw new AppError(
                "CONFLICT",
                "A user with this email already exists.",
                { field: "email" }
            );
        }

        const id = cuid();
        await execute(
            `INSERT INTO users (id, name, email, role, is_active)
             VALUES (?, ?, ?, ?, 1)`,
            [id, email.split("@")[0], email, role]
        );

        logger.info("users.addUser", { actorId: actor.id, userId: id, email, role });
        invalidate();
        return { ok: true, userId: id };
    } catch (e) {
        return toActionResult(e);
    }
}

export async function updateUserRole(input: {
    userId: string;
    role: UserRole;
}): Promise<Ok<object> | Fail> {
    const actor = await requireAuth(UserRole.HR_HEAD);

    const parsed = UpdateRoleSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };
    }
    const { userId, role } = parsed.data;

    try {
        if (userId === actor.id && role !== UserRole.HR_HEAD) {
            throw new AppError(
                "FORBIDDEN",
                "You cannot demote your own HR Head role. Ask another HR Head to make this change."
            );
        }

        const target = await queryOne<{ id: string; role: UserRole }>(
            "SELECT id, role FROM users WHERE id = ? LIMIT 1",
            [userId]
        );
        if (!target) throw new AppError("NOT_FOUND", "User not found.");

        if (target.role === UserRole.HR_HEAD && role !== UserRole.HR_HEAD) {
            await assertAnotherHRHeadExists(target.id);
        }

        await execute("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
        logger.info("users.updateUserRole", { actorId: actor.id, userId, role });
        invalidate();
        return { ok: true };
    } catch (e) {
        return toActionResult(e);
    }
}

export async function setUserActive(input: {
    userId: string;
    isActive: boolean;
}): Promise<Ok<object> | Fail> {
    const actor = await requireAuth(UserRole.HR_HEAD);

    const parsed = SetActiveSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0].message, code: "VALIDATION" };
    }
    const { userId, isActive } = parsed.data;

    try {
        if (userId === actor.id && !isActive) {
            throw new AppError(
                "FORBIDDEN",
                "You cannot deactivate your own account."
            );
        }

        const target = await queryOne<{ id: string; role: UserRole; is_active: 0 | 1 }>(
            "SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1",
            [userId]
        );
        if (!target) throw new AppError("NOT_FOUND", "User not found.");

        if (!isActive && target.role === UserRole.HR_HEAD) {
            await assertAnotherHRHeadExists(target.id);
        }

        await execute("UPDATE users SET is_active = ? WHERE id = ?", [
            isActive ? 1 : 0,
            userId,
        ]);
        logger.info("users.setUserActive", { actorId: actor.id, userId, isActive });
        invalidate();
        return { ok: true };
    } catch (e) {
        return toActionResult(e);
    }
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function assertAnotherHRHeadExists(excludeUserId: string): Promise<void> {
    const row = await queryOne<{ n: number }>(
        `SELECT COUNT(*) AS n FROM users
         WHERE role = 'HR_HEAD' AND is_active = 1 AND id <> ?`,
        [excludeUserId]
    );
    if (!row || Number(row.n) === 0) {
        throw new AppError(
            "CONFLICT",
            "There must always be at least one active HR Head. Add another HR Head before making this change."
        );
    }
}

