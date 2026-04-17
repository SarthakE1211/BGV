"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    uploadClearanceTemplate,
    deleteClearanceTemplate,
} from "@/src/actions/templates";
import { fmtDateTime } from "@/src/lib/format";

interface Props {
    current: {
        filename: string;
        sizeBytes: number;
        uploadedAt: string; // serialized ISO
        uploadedByName: string | null;
    } | null;
}

function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
}


export default function TemplateUploader({ current }: Props) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, startUpload] = useTransition();
    const [deleting, startDelete] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [justUploaded, setJustUploaded] = useState<string | null>(null);

    const MAX_BYTES = 5 * 1024 * 1024; // keep in sync with actions/templates.ts

    const handleFile = (file: File | null) => {
        if (!file) return;
        setError(null);
        setJustUploaded(null);

        if (!file.name.toLowerCase().endsWith(".docx")) {
            setError("File must be a .docx Word document");
            if (inputRef.current) inputRef.current.value = "";
            return;
        }
        if (file.size > MAX_BYTES) {
            setError(
                `File is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Max is 5 MB.`
            );
            if (inputRef.current) inputRef.current.value = "";
            return;
        }

        const form = new FormData();
        form.append("file", file);

        startUpload(async () => {
            try {
                const res = await uploadClearanceTemplate(form);
                if (!res.ok) {
                    setError(res.error);
                    return;
                }
                setJustUploaded(res.filename);
                if (inputRef.current) inputRef.current.value = "";
                router.refresh();
            } catch (e) {
                // 413 "Body exceeded 1 MB limit" from Next's Server Action boundary
                // lands here — surface a readable message instead of crashing.
                const msg = e instanceof Error ? e.message : "Upload failed";
                setError(msg.includes("Body exceeded")
                    ? "Upload too large for the server. Ask your developer to raise Server Actions body limit."
                    : msg);
                if (inputRef.current) inputRef.current.value = "";
            }
        });
    };

    const handleRemove = () => {
        if (!confirm("Remove the uploaded clearance letter template?")) return;
        setError(null);
        startDelete(async () => {
            const res = await deleteClearanceTemplate();
            if (!res.ok) {
                setError(res.error);
                return;
            }
            router.refresh();
        });
    };

    const busy = uploading || deleting;

    return (
        <div>
            <p style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 8 }}>
                Upload the .docx template used to generate the BGV clearance letter.
                Supported placeholders (examples):{" "}
                <code>{"{{CANDIDATE_NAME}}"}</code>,{" "}
                <code>{"{{PARTNER_NAME}}"}</code>,{" "}
                <code>{"{{CLIENT_ACCOUNT}}"}</code>,{" "}
                <code>{"{{REQUEST_NUMBER}}"}</code>,{" "}
                <code>{"{{COMPLETION_DATE}}"}</code>,{" "}
                <code>{"{{APPROVED_BY}}"}</code>,{" "}
                <code>{"{{CHECKS_SUMMARY}}"}</code>.
            </p>

            {current && (
                <div
                    style={{
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        background: "#f8fafc",
                        marginBottom: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>
                            ✓ {current.filename}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-light)", marginTop: 2 }}>
                            {formatBytes(current.sizeBytes)}
                            {" · "}
                            Uploaded {fmtDateTime(current.uploadedAt)}
                            {current.uploadedByName ? ` by ${current.uploadedByName}` : ""}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        <a
                            href="/api/templates/clearance"
                            download={current.filename}
                            className="btn btn-outline btn-sm"
                        >
                            Download
                        </a>
                        <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={handleRemove}
                            disabled={busy}
                            style={{ color: "#dc2626", borderColor: "#fecaca" }}
                        >
                            {deleting ? "Removing…" : "Remove"}
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    disabled={busy}
                    style={{ display: "none" }}
                    id="template-file-input"
                />
                <label
                    htmlFor="template-file-input"
                    className="btn btn-outline btn-sm"
                    style={{
                        cursor: busy ? "wait" : "pointer",
                        opacity: busy ? 0.6 : 1,
                    }}
                >
                    {uploading
                        ? "Uploading…"
                        : current
                          ? "Replace Template (.docx)"
                          : "Upload Template (.docx)"}
                </label>
                {!current && !justUploaded && (
                    <span style={{ fontSize: 11, color: "var(--text-light)" }}>
                        No template uploaded yet — letters fall back to the built-in HTML
                        layout.
                    </span>
                )}
                {justUploaded && (
                    <span style={{ fontSize: 11, color: "var(--success)" }}>
                        ✓ Saved {justUploaded}
                    </span>
                )}
            </div>

            {error && (
                <div className="info-box info-red" style={{ marginTop: 10 }}>
                    {error}
                </div>
            )}
        </div>
    );
}
