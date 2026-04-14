// src/app/api/checks-matrix/route.ts
//
// POST /api/checks-matrix
// Body: { partnerId, partnerClientId?, region }
// Returns: { checks: [{ checkType, source }] }
//
// Called live by the New Request form whenever partner / client / region
// changes, so the user sees the resolved check list before submitting.

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/src/lib/auth.helpers";
import { resolveCheckMatrix } from "@/src/lib/check-matrix";
import { parseBody } from "@/src/lib/api";
import { toApiResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
    partnerId: z.string().min(1, "partnerId is required"),
    partnerClientId: z.string().optional().nullable(),
    region: z.enum(["USA", "CANADA", "LATAM"]).default("USA"),
});

export async function POST(req: Request) {
    try {
        await requireAuth();
        const body = await parseBody(req, BodySchema);
        const checks = await resolveCheckMatrix(
            body.partnerId,
            body.partnerClientId ?? null,
            body.region
        );
        return NextResponse.json({ checks });
    } catch (e) {
        return toApiResponse(e);
    }
}
