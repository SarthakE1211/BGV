// GET /api/templates/clearance — proxies to Django template download.

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { api } from "@/src/lib/api-client";

export const dynamic = "force-dynamic";

export async function GET() {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const res = await api<Response>("/settings/templates/clearance_letter/download/", {
            userId: user.id,
            raw: true,
        });

        const rawRes = res as unknown as Response;
        const bytes = await rawRes.arrayBuffer();
        const contentType = rawRes.headers.get("Content-Type") ?? "application/octet-stream";
        const disposition = rawRes.headers.get("Content-Disposition") ?? 'attachment; filename="template.docx"';

        return new NextResponse(bytes, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": disposition,
                "Content-Length": String(bytes.byteLength),
            },
        });
    } catch {
        return NextResponse.json({ error: "No template uploaded" }, { status: 404 });
    }
}
