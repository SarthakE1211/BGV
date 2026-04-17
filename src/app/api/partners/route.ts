import { NextResponse } from "next/server";
import { getPartnerOptionsWithIds } from "@/src/lib/partners";

export async function GET() {
    const partners = await getPartnerOptionsWithIds();
    return NextResponse.json({ partners });
}
