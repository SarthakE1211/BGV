// src/lib/templates.ts
//
// Storage + rendering for uploaded .docx templates. For now the only
// supported template is the BGV clearance letter (key="clearance_letter").
//
// Placeholders use {{DOUBLE_CURLY}} syntax (matches prototype). Example tags
// your .docx template can use:
//   {{CANDIDATE_NAME}}     {{CANDIDATE_EMAIL}}    {{PARTNER_NAME}}
//   {{CLIENT_ACCOUNT}}     {{ROLE_TYPE}}          {{REGION}}
//   {{REQUEST_NUMBER}}     {{INITIATION_DATE}}    {{COMPLETION_DATE}}
//   {{APPROVED_BY}}        {{APPROVAL_DATE}}      {{CHECKS_SUMMARY}}

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

import { query, execute } from "@/src/lib/db";
import type { RequestDetailRow, CheckDetailRow } from "@/src/lib/request-detail";

export const CLEARANCE_TEMPLATE_KEY = "clearance_letter";

export interface TemplateMeta {
    key: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: Date;
    uploadedByName: string | null;
}

export interface TemplateFull extends TemplateMeta {
    bytes: Buffer;
}

/** Read metadata only — avoids pulling the LONGBLOB when we just need the
 *  filename / upload timestamp for the Settings UI. */
export async function getTemplateMeta(
    key: string = CLEARANCE_TEMPLATE_KEY
): Promise<TemplateMeta | null> {
    const rows = await query<{
        key: string;
        filename: string;
        mime_type: string;
        size_bytes: number;
        uploaded_at: Date;
        uploaded_by_name: string | null;
    }>(
        `SELECT t.\`key\`, t.filename, t.mime_type, t.size_bytes, t.uploaded_at,
                u.name AS uploaded_by_name
         FROM app_templates t
         LEFT JOIN users u ON u.id = t.uploaded_by_id
         WHERE t.\`key\` = ?
         LIMIT 1`,
        [key]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
        key: r.key,
        filename: r.filename,
        mimeType: r.mime_type,
        sizeBytes: r.size_bytes,
        uploadedAt: r.uploaded_at,
        uploadedByName: r.uploaded_by_name,
    };
}

/** Full read (bytes + metadata). Used by the download route and the docx
 *  renderer. */
export async function getTemplate(
    key: string = CLEARANCE_TEMPLATE_KEY
): Promise<TemplateFull | null> {
    const rows = await query<{
        key: string;
        filename: string;
        mime_type: string;
        size_bytes: number;
        uploaded_at: Date;
        uploaded_by_name: string | null;
        bytes: Buffer;
    }>(
        `SELECT t.\`key\`, t.filename, t.mime_type, t.size_bytes, t.uploaded_at,
                t.bytes, u.name AS uploaded_by_name
         FROM app_templates t
         LEFT JOIN users u ON u.id = t.uploaded_by_id
         WHERE t.\`key\` = ?
         LIMIT 1`,
        [key]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
        key: r.key,
        filename: r.filename,
        mimeType: r.mime_type,
        sizeBytes: r.size_bytes,
        uploadedAt: r.uploaded_at,
        uploadedByName: r.uploaded_by_name,
        bytes: r.bytes,
    };
}

export async function saveTemplate(
    key: string,
    filename: string,
    mimeType: string,
    bytes: Buffer,
    uploadedById: string
): Promise<void> {
    await execute(
        `INSERT INTO app_templates
             (\`key\`, filename, mime_type, bytes, size_bytes, uploaded_by_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
             filename = VALUES(filename),
             mime_type = VALUES(mime_type),
             bytes = VALUES(bytes),
             size_bytes = VALUES(size_bytes),
             uploaded_by_id = VALUES(uploaded_by_id),
             uploaded_at = NOW(3)`,
        [key, filename, mimeType, bytes, bytes.length, uploadedById]
    );
}

export async function deleteTemplate(key: string): Promise<void> {
    await execute(`DELETE FROM app_templates WHERE \`key\` = ?`, [key]);
}

// ─── Docxtemplater renderer ──────────────────────────────────────────────────
function fmtDate(d: Date | null | undefined): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

/** Populate the .docx template with request data and return the rendered
 *  bytes. Uses {{...}} delimiters. Missing placeholders are left blank. */
export function renderClearanceDocx(
    templateBytes: Buffer,
    request: RequestDetailRow,
    checks: CheckDetailRow[]
): Buffer {
    const zip = new PizZip(templateBytes);
    const doc = new Docxtemplater(zip, {
        delimiters: { start: "{{", end: "}}" },
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "",
    });

    doc.render({
        CANDIDATE_NAME: request.candidate.name,
        CANDIDATE_EMAIL: request.candidate.email,
        CANDIDATE_PHONE: request.candidate.phone ?? "—",
        PARTNER_NAME: request.partner.name,
        PARTNER_CODE: request.partner.code,
        CLIENT_ACCOUNT: request.client?.name ?? request.clientAccount ?? "—",
        ROLE_TYPE: request.roleType,
        REGION: request.region,
        BGV_VENDOR: request.bgvVendor,
        REQUEST_NUMBER: request.requestNumber,
        INITIATION_DATE: fmtDate(request.initiationDate),
        COMPLETION_DATE: fmtDate(request.completionDate),
        APPROVED_BY: request.approvedBy?.name ?? "—",
        APPROVAL_DATE: fmtDate(new Date()),
        SUBMITTED_BY: request.submittedBy.name,
        ISSUE_DATE: fmtDate(new Date()),
        CHECKS_SUMMARY: checks
            .map(
                (c) =>
                    `${c.checkType}: ${c.status}` +
                    (c.completedAt ? ` (${fmtDate(c.completedAt)})` : "")
            )
            .join("\n"),
        CHECKS: checks.map((c) => ({
            TYPE: c.checkType,
            SOURCE: c.requirementSource ?? "—",
            STATUS: c.status,
            COMPLETED: fmtDate(c.completedAt),
        })),
    });

    return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}

export async function setRequestLetterDocx(
    requestId: string,
    bytes: Buffer
): Promise<void> {
    await execute(
        `UPDATE bgv_requests SET letter_docx = ? WHERE id = ?`,
        [bytes, requestId]
    );
}

export async function getRequestLetterDocx(
    requestId: string
): Promise<Buffer | null> {
    const rows = await query<{ letter_docx: Buffer | null }>(
        `SELECT letter_docx FROM bgv_requests WHERE id = ? LIMIT 1`,
        [requestId]
    );
    return rows[0]?.letter_docx ?? null;
}
