// GET /api/requests/[id]/letter/docx
// Serves the populated .docx clearance letter as a download.
// Returns 404 if no template was configured when the letter was issued.

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { queryOne } from "@/src/lib/db";
import { getRequestLetterDocx } from "@/src/lib/templates";

export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireAuth();
    const { id } = await params;

    // Light access gate: SDMs can only download letters for their own
    // requests, Specialists for their assigned ones, HR_HEAD sees all.
    const meta = await queryOne<{
        submitted_by_id: string;
        assigned_specialist_id: string | null;
        request_number: string;
        candidate_name: string;
    }>(
        `SELECT r.submitted_by_id, r.assigned_specialist_id,
                r.request_number, c.name AS candidate_name
         FROM bgv_requests r
         JOIN candidates c ON c.id = r.candidate_id
         WHERE r.id = ? LIMIT 1`,
        [id]
    );
    if (!meta) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (user.role === "SDM" && meta.submitted_by_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
        user.role === "SPECIALIST" &&
        meta.assigned_specialist_id !== user.id
    ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bytes = await getRequestLetterDocx(id);
    if (!bytes) {
        return NextResponse.json(
            { error: "No .docx letter available for this request" },
            { status: 404 }
        );
    }

    const safeName = meta.candidate_name.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 60);
    const filename = `BGV-Letter-${meta.request_number}-${safeName}.docx`;

    return new NextResponse(new Uint8Array(bytes), {
        status: 200,
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": String(bytes.length),
        },
    });
}
