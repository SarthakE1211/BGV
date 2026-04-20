// POST /api/checks-matrix — proxies to Django check-matrix resolver.

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { api } from "@/src/lib/api-client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const user = await requireAuth();
        const body = await req.json();

        const checks = await api<Array<{ checkType?: string; check_type?: string; source?: string }>>(
            "/partners/check-matrix/",
            {
                method: "POST",
                userId: user.id,
                body: {
                    partner_id: body.partnerId,
                    partner_client_id: body.partnerClientId ?? null,
                    region: body.region ?? "USA",
                },
            }
        );

        // Normalize field names for the frontend
        const normalized = (Array.isArray(checks) ? checks : []).map((c) => ({
            checkType: c.checkType ?? c.check_type ?? "",
            source: c.source ?? "",
        }));

        return NextResponse.json({ checks: normalized });
    } catch {
        return NextResponse.json({ checks: [] });
    }
}
