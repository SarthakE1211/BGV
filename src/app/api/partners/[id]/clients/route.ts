// GET /api/partners/[id]/clients — proxies to Django.

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
        const clients = await api<Array<{ id: string; client_name?: string; clientName?: string }>>(
            "/partners/clients/",
            { userId: user.id, params: { partner_id: id } }
        );
        return NextResponse.json({
            clients: clients.map((c) => ({
                id: c.id,
                clientName: c.client_name ?? c.clientName ?? "",
            })),
        });
    } catch {
        return NextResponse.json({ clients: [] });
    }
}
