// GET /api/requests/[id]/letter/docx — proxies to Django for the .docx download.

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { api } from "@/src/lib/api-client";

export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireAuth();
    const { id } = await params;

    try {
        const res = await api<Response>(`/bgv/requests/${id}/letter/docx/`, {
            userId: user.id,
            raw: true,
        });

        const rawRes = res as unknown as Response;
        const bytes = await rawRes.arrayBuffer();
        const disposition = rawRes.headers.get("Content-Disposition") ?? `attachment; filename="letter.docx"`;

        return new NextResponse(bytes, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": disposition,
                "Content-Length": String(bytes.byteLength),
            },
        });
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}
