// src/app/api/requests/[id]/email-sdm/route.ts
//
// POST — sends a BGV status update email to the SDM who submitted the request.
// Delegates to Django API. If Django doesn't expose a dedicated email-sdm
// endpoint, we fetch the request detail and log the email (stub).

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { api, ApiError } from "@/src/lib/api-client";

export const dynamic = "force-dynamic";

interface RequestDetailResponse {
    id: string;
    request_number?: string;
    requestNumber?: string;
    status: string;
    candidate_name?: string;
    candidate_email?: string;
    candidate?: { name: string; email: string };
    partner_name?: string;
    partner?: { name: string; code: string };
    client_name?: string | null;
    client?: { name: string } | null;
    submitted_by_name?: string;
    submitted_by_email?: string;
    submittedBy?: { name: string; email: string };
    checks?: Array<{
        check_type?: string;
        checkType?: string;
        status: string;
        requirement_source?: string;
        requirementSource?: string;
        remarks?: string | null;
    }>;
}

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireAuth();
    const { id } = await params;

    // Try Django dedicated endpoint first
    try {
        const result = await api<{ ok: boolean }>(
            `/bgv/requests/${id}/email-sdm/`,
            { method: "POST", userId: user.id }
        );
        return NextResponse.json(result);
    } catch (e) {
        // If Django returns 404 (endpoint doesn't exist), fall back to stub
        if (!(e instanceof ApiError) || e.status !== 404) {
            // Real error — propagate
            const status = e instanceof ApiError ? e.status : 500;
            const message = e instanceof Error ? e.message : "Internal error";
            return NextResponse.json({ error: message }, { status });
        }
    }

    // Fallback: fetch request detail and log the email (stub)
    try {
        const request = await api<RequestDetailResponse>(
            `/bgv/requests/${id}/`,
            { userId: user.id }
        );

        const sdmEmail =
            request.submitted_by_email ??
            request.submittedBy?.email ??
            "unknown";
        const sdmName =
            request.submitted_by_name ??
            request.submittedBy?.name ??
            "SDM";
        const candidateName =
            request.candidate_name ??
            request.candidate?.name ??
            "Unknown";
        const reqNumber =
            request.request_number ??
            request.requestNumber ??
            id;

        console.log(
            `[email-sdm stub] Would send BGV update email to ${sdmName} <${sdmEmail}> ` +
            `for request ${reqNumber} (candidate: ${candidateName}). ` +
            `Sent by: ${user.name}`
        );

        return NextResponse.json({ ok: true, stub: true });
    } catch (e) {
        const status = e instanceof ApiError ? e.status : 500;
        const message = e instanceof Error ? e.message : "Failed to fetch request";
        return NextResponse.json({ error: message }, { status });
    }
}
