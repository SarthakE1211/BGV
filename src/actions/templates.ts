"use server";

// HR_HEAD-only. Receives the uploaded .docx from the Settings form,
// validates it, and persists to the `app_templates` table.

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/src/lib/auth.helpers";
import {
    CLEARANCE_TEMPLATE_KEY,
    saveTemplate,
    deleteTemplate,
} from "@/src/lib/templates";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — .docx templates are tiny
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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

    const buf = Buffer.from(await file.arrayBuffer());
    await saveTemplate(
        CLEARANCE_TEMPLATE_KEY,
        file.name,
        file.type || DOCX_MIME,
        buf,
        user.id
    );

    revalidatePath("/settings");
    return { ok: true, filename: file.name, sizeBytes: buf.length };
}

export async function deleteClearanceTemplate(): Promise<
    { ok: true } | { ok: false; error: string }
> {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        return { ok: false, error: "Only HR Head can remove the template" };
    }
    await deleteTemplate(CLEARANCE_TEMPLATE_KEY);
    revalidatePath("/settings");
    return { ok: true };
}
