// src/lib/templates.ts
//
// Template metadata for the Settings UI. All storage + rendering now lives
// in Django — this module just calls the API for the metadata display.

import { api, ApiError } from "@/src/lib/api-client";

export const CLEARANCE_TEMPLATE_KEY = "clearance_letter";

export interface TemplateMeta {
    key: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: Date;
    uploadedByName: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Read template metadata for the Settings UI. Returns null if no template
 *  has been uploaded yet. */
export async function getTemplateMeta(
    key: string = CLEARANCE_TEMPLATE_KEY,
    userId?: string
): Promise<TemplateMeta | null> {
    try {
        const r = await api<any>("/settings/templates/", { userId });

        // Django may return a single object or an array — handle both.
        const item = Array.isArray(r) ? r.find((t: any) => t.key === key) : r;
        if (!item || !item.filename) return null;

        return {
            key: item.key ?? key,
            filename: item.filename,
            mimeType: item.mime_type ?? item.mimeType ?? "application/octet-stream",
            sizeBytes: Number(item.size_bytes ?? item.sizeBytes ?? 0),
            uploadedAt: new Date(item.uploaded_at ?? item.uploadedAt ?? ""),
            uploadedByName: item.uploaded_by_name ?? item.uploadedByName ?? null,
        };
    } catch (e) {
        // 404 = no template uploaded yet → return null, not an error.
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
    }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
