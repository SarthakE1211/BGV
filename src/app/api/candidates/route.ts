// src/app/api/candidates/route.ts
//
// GET /api/candidates?q=&tab=&page=
// Used by the Employee Database search bar (debounced fetch).

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { listEmployees, PAGE_SIZE, type EmployeeTab } from "@/src/lib/employees";

export const dynamic = "force-dynamic";

const VALID_TABS: EmployeeTab[] = ["all", "green", "amber", "red", "blacklisted"];

export async function GET(req: Request) {
    await requireAuth();
    const sp = new URL(req.url).searchParams;

    const tabParam = sp.get("tab");
    const tab: EmployeeTab =
        tabParam && VALID_TABS.includes(tabParam as EmployeeTab)
            ? (tabParam as EmployeeTab)
            : "all";

    const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);

    const { rows, total } = await listEmployees(
        { q: sp.get("q"), tab },
        page
    );

    return NextResponse.json({
        total,
        page,
        pageSize: PAGE_SIZE,
        candidates: rows,
    });
}
