// GET /api/requests/[id]/letter — proxies to Django for the clearance letter HTML.

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
        const res = await api<Response>(`/bgv/requests/${id}/letter/`, {
            userId: user.id,
            raw: true,
        });

        const rawRes = res as unknown as Response;
        const html = await rawRes.text();

        // Forward Django's Content-Disposition so the browser print/save
        // dialog shows the candidate name in the filename.
        const disposition = rawRes.headers.get("Content-Disposition") ?? "";

        const headers: Record<string, string> = {
            "Content-Type": "text/html; charset=utf-8",
        };
        if (disposition) {
            headers["Content-Disposition"] = disposition;
        }

        return new NextResponse(html, { status: 200, headers });
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}
