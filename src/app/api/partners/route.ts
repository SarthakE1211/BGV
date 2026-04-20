import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { api } from "@/src/lib/api-client";

export async function GET() {
    const user = await requireAuth();
    const partners = await api<Array<{ id: string; code: string; name: string }>>(
        "/partners/options/",
        { userId: user.id }
    );
    return NextResponse.json({ partners });
}
