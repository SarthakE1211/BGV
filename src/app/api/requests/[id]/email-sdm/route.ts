// src/app/api/requests/[id]/email-sdm/route.ts
//
// POST — sends a BGV status update email to the SDM who submitted the request.

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import {
    getRequestDetail,
    getRequestChecks,
} from "@/src/lib/request-detail";
import { sendEmail } from "@/src/lib/email";

export const dynamic = "force-dynamic";

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireAuth();
    const { id } = await params;

    const request = await getRequestDetail(id, user.role, user.id);
    if (!request) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const checks = await getRequestChecks(id);

    const cleared = checks.filter((c) => c.status === "CLEARED").length;
    const failed  = checks.filter((c) => c.status === "FAILED").length;
    const pending = checks.filter(
        (c) => c.status === "PENDING" || c.status === "IN_PROGRESS"
    ).length;

    const checkLines = checks
        .map((c) => {
            const label =
                c.requirementSource
                    ? `${c.checkType} — ${c.requirementSource}`
                    : c.checkType;
            const icon =
                c.status === "CLEARED"
                    ? "✅"
                    : c.status === "FAILED"
                    ? "❌"
                    : "⏳";
            return `  ${icon} ${label}: ${c.status}${c.remarks ? ` (${c.remarks})` : ""}`;
        })
        .join("\n");

    const subject = `BGV Update — ${request.candidate.name} [${request.requestNumber}]`;

    const body = `Hi ${request.submittedBy.name},

Here is the latest BGV status update for ${request.candidate.name}:

Request:   ${request.requestNumber}
Candidate: ${request.candidate.name} <${request.candidate.email}>
Partner:   ${request.partner.name}${request.client ? ` / ${request.client.name}` : ""}
Overall Status: ${request.status}

Checks (${cleared}/${checks.length} completed, ${failed} failed, ${pending} pending):
${checkLines}

Sent by: ${user.name}
`.trim();

    await sendEmail({
        trigger: "SDM_UPDATE",
        requestId: id,
        recipient: request.submittedBy.email,
        subject,
        body,
    });

    return NextResponse.json({ ok: true });
}
