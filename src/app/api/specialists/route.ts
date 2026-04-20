import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { getSpecialistOptions } from "@/src/lib/tracker";

export async function GET() {
    const user = await requireAuth();
    const specialists = await getSpecialistOptions(user.id);
    return NextResponse.json({ specialists });
}
