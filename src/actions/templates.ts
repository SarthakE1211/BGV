"use server";

// HR_HEAD-only. Uploads/deletes .docx clearance templates via Django API.

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/src/lib/auth.helpers";
import { api, ApiError } from "@/src/lib/api-client";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — .docx templates are tiny

export type UploadTemplateResult =
    | { ok: true; filename: string; sizeBytes: number }
    | { ok: false; error: string };

export async function uploadClearanceTemplate(
    formData: FormData
): Promise<UploadTemplateResult> {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        return { ok: false, error: "Only HR Head can upload the template" };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
        return { ok: false, error: "No file provided" };
    }
    if (!file.name.toLowerCase().endsWith(".docx")) {
        return { ok: false, error: "File must be a .docx Word document" };
    }
    if (file.size === 0) {
        return { ok: false, error: "File is empty" };
    }
    if (file.size > MAX_BYTES) {
        return {
            ok: false,
            error: `File is too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB)`,
        };
    }

    try {
        const uploadForm = new FormData();
        uploadForm.append("file", file);

        const result = await api<{
            filename?: string;
            size_bytes?: number;
            sizeBytes?: number;
        }>("/templates/", {
            method: "POST",
            userId: user.id,
            formData: uploadForm,
        });

        revalidatePath("/settings");
        return {
            ok: true,
            filename: result.filename ?? file.name,
            sizeBytes: result.size_bytes ?? result.sizeBytes ?? file.size,
        };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
            return {
                ok: false,
                error:
                    (body?.error as string) ??
                    (body?.detail as string) ??
                    e.message,
            };
        }
        return {
            ok: false,
            error:
                e instanceof Error
                    ? e.message
                    : "An unexpected error occurred",
        };
    }
}

export async function deleteClearanceTemplate(): Promise<
    { ok: true } | { ok: false; error: string }
> {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        return { ok: false, error: "Only HR Head can remove the template" };
    }

    try {
        await api("/templates/clearance/", {
            method: "DELETE",
            userId: user.id,
        });
        revalidatePath("/settings");
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) {
            const body = e.body as Record<string, unknown> | undefined;
            return {
                ok: false,
                error:
                    (body?.error as string) ??
                    (body?.detail as string) ??
                    e.message,
            };
        }
        return {
            ok: false,
            error:
                e instanceof Error
                    ? e.message
                    : "An unexpected error occurred",
        };
    }
}
