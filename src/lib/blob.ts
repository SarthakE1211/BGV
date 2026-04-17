// src/lib/blob.ts
//
// Thin wrapper around @azure/storage-blob. Lazy-inits a container client from
// AZURE_STORAGE_CONNECTION_STRING + AZURE_STORAGE_CONTAINER so the app still
// boots (and the DB copy still works) when Azure credentials are absent.
//
// Exposes isBlobConfigured() so callers can skip cloud writes gracefully in
// dev environments that don't have Azure set up yet.

import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import { logger } from "@/src/lib/logger";
import { getSetting } from "@/src/lib/settings";

const CONTAINER = process.env.AZURE_STORAGE_CONTAINER ?? "bgv-documents";
const CONN = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "";

let cached: ContainerClient | null = null;

export function isBlobConfigured(): boolean {
    return Boolean(CONN);
}

function getContainer(): ContainerClient {
    if (cached) return cached;
    if (!CONN) {
        throw new Error(
            "AZURE_STORAGE_CONNECTION_STRING is not set. Call isBlobConfigured() first."
        );
    }
    const svc = BlobServiceClient.fromConnectionString(CONN);
    cached = svc.getContainerClient(CONTAINER);
    return cached;
}

/**
 * Upload a UTF-8 text body to the configured container. Creates the container
 * on first use. Returns the blob URL on success.
 *
 * Callers should treat this as best-effort — wrap in try/catch and fall back
 * to the DB copy if the upload fails.
 */
export async function uploadText(
    blobName: string,
    body: string,
    contentType = "text/html; charset=utf-8"
): Promise<string> {
    const container = getContainer();
    await container.createIfNotExists();
    const block = container.getBlockBlobClient(blobName);
    const buf = Buffer.from(body, "utf-8");
    await block.uploadData(buf, {
        blobHTTPHeaders: { blobContentType: contentType },
    });
    return block.url;
}

/** Fire-and-forget variant. Skips silently if either:
 *   - Azure credentials aren't set, or
 *   - the "SharePoint Document Storage" toggle at /settings is off.
 *  Errors during upload are logged, never thrown. */
export async function uploadTextSafe(
    blobName: string,
    body: string,
    contentType?: string
): Promise<string | null> {
    if (!isBlobConfigured()) return null;
    const storageEnabled = await getSetting("m365.sharepoint_storage").catch(
        () => true
    );
    if (!storageEnabled) {
        logger.info("blob.upload skipped (storage toggle off)", { blobName });
        return null;
    }
    try {
        return await uploadText(blobName, body, contentType);
    } catch (err) {
        logger.error("blob.upload failed", { err, blobName });
        return null;
    }
}
