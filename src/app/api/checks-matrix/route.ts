// src/app/api/checks-matrix/route.ts
//
// POST /api/checks-matrix
// Body: { partnerId, partnerClientId?, region }
// Returns: { checks: [{ checkType, source }] }
//
// Called live by the New Request form whenever partner / client / region
// changes, so the user sees the resolved check list before submitting.

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { resolveCheckMatrix } from "@/src/lib/check-matrix";
import type { Region } from "@/src/lib/enums";

export const dynamic = "force-dynamic";

const VALID_REGIONS: Region[] = ["USA", "CANADA", "LATAM"];

export async function POST(req: Request) {
    await requireAuth();

    let body: { partnerId?: string; partnerClientId?: string; region?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body.partnerId) {
        return NextResponse.json({ error: "partnerId is required" }, { status: 400 });
    }
    const region = VALID_REGIONS.includes(body.region as Region)
        ? (body.region as Region)
        : "USA";

    const checks = await resolveCheckMatrix(
        body.partnerId,
        body.partnerClientId ?? null,
        region
    );

    return NextResponse.json({ checks });
}
