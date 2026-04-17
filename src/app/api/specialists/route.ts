import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { getSpecialistOptions } from "@/src/lib/tracker";

export async function GET() {
    await requireAuth();
    const specialists = await getSpecialistOptions();
    return NextResponse.json({ specialists });
}
