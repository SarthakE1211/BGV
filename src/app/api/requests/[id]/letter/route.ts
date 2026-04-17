// GET /api/requests/[id]/letter — serves the BGV clearance letter as HTML.
// If the letter has already been issued, returns the immutable snapshot from
// bgv_requests.letter_html (same bytes that were uploaded to Blob). If not,
// live-renders for preview so HR can see what the letter will look like
// before they actually issue it.

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { queryOne } from "@/src/lib/db";
import {
    getRequestDetail,
    getRequestChecks,
} from "@/src/lib/request-detail";
import { renderClearanceLetterHtml } from "@/src/lib/letter";

export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireAuth();
    const { id } = await params;

    // Fast path: letter has been issued → serve the immutable snapshot,
    // but only if the caller is allowed to see this request.
    //   SDM        → must be the submitter
    //   SPECIALIST → must be the assigned specialist
    //   HR_HEAD    → always allowed
    const snapshot = await queryOne<{
        letter_html: string | null;
        submitted_by_id: string;
        assigned_specialist_id: string | null;
    }>(
        `SELECT letter_html, submitted_by_id, assigned_specialist_id
         FROM bgv_requests WHERE id = ? LIMIT 1`,
        [id]
    );
    if (snapshot) {
        if (user.role === "SDM" && snapshot.submitted_by_id !== user.id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (
            user.role === "SPECIALIST" &&
            snapshot.assigned_specialist_id !== user.id
        ) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (snapshot.letter_html) {
            return new NextResponse(snapshot.letter_html, {
                status: 200,
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        }
    }

    // Fallback: live preview. Only allowed when the request is GREEN + approved.
    const [request, checks] = await Promise.all([
        getRequestDetail(id, user.role, user.id),
        getRequestChecks(id),
    ]);
    if (!request) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (request.status !== "GREEN" || !request.approvedBy) {
        return NextResponse.json(
            { error: "Request must be GREEN and approved" },
            { status: 400 }
        );
    }

    const html = renderClearanceLetterHtml(request, checks);
    return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}
