// src/app/api/requests/[id]/route.ts

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import {
    getRequestDetail,
    getRequestChecks,
    getRequestActivity,
} from "@/src/lib/request-detail";

export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await requireAuth();
    const { id } = await params;

    const request = await getRequestDetail(id, user.role, user.id);
    if (!request) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [checks, activity] = await Promise.all([
        getRequestChecks(id, user.id),
        getRequestActivity(id, 50, user.id),
    ]);

    return NextResponse.json({ request, checks, activity });
}
