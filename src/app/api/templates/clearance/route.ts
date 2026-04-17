// GET /api/templates/clearance
// Serves the uploaded clearance letter .docx template for HR Head review.
// HR_HEAD only.

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { getTemplate, CLEARANCE_TEMPLATE_KEY } from "@/src/lib/templates";

export const dynamic = "force-dynamic";

export async function GET() {
    const user = await requireAuth();
    if (user.role !== "HR_HEAD") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tpl = await getTemplate(CLEARANCE_TEMPLATE_KEY);
    if (!tpl) {
        return NextResponse.json({ error: "No template uploaded" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(tpl.bytes), {
        status: 200,
        headers: {
            "Content-Type": tpl.mimeType,
            "Content-Disposition": `attachment; filename="${tpl.filename.replace(/"/g, "")}"`,
            "Content-Length": String(tpl.sizeBytes),
        },
    });
}
