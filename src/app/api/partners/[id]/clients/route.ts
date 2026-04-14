// src/app/api/partners/[id]/clients/route.ts
//
// GET /api/partners/[id]/clients
// Returns the list of client accounts for a given partner — used to
// populate the "Client Account" dropdown in the New Request form.

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { query } from "@/src/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    await requireAuth();
    const { id } = await params;

    const clients = await query<{ id: string; client_name: string }>(
        `SELECT id, client_name
         FROM partner_clients
         WHERE partner_id = ?
         ORDER BY client_name ASC`,
        [id]
    );

    return NextResponse.json({
        clients: clients.map((c) => ({ id: c.id, clientName: c.client_name })),
    });
}
