// src/app/api/requests/route.ts
//
// GET /api/requests?tab=&q=&partner=&region=&roleType=&sdm=&page=
// Returns { total, page, pageSize, requests }.
// Role-aware: SDM sees only own requests (user-provided `sdm` is ignored).

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import {
    listRequests,
    PAGE_SIZE,
    type RequestsTab,
    type ListFilters,
} from "@/src/lib/requests";
import type { Region, RoleType } from "@/src/lib/enums";

export const dynamic = "force-dynamic";

const VALID_TABS: RequestsTab[] = [
    "all",
    "pending",
    "in-progress",
    "awaiting-approval",
    "complete",
];
const VALID_REGIONS: Region[] = ["USA", "CANADA", "LATAM"];
const VALID_ROLES: RoleType[] = ["FTE_W2", "PRO", "DISPATCH", "BACKFILL"];

export async function GET(req: Request) {
    const user = await requireAuth();
    const sp = new URL(req.url).searchParams;

    const tabParam = sp.get("tab");
    const tab: RequestsTab =
        tabParam && VALID_TABS.includes(tabParam as RequestsTab)
            ? (tabParam as RequestsTab)
            : "all";

    const regionParam = sp.get("region");
    const roleParam = sp.get("roleType");

    const filters: ListFilters = {
        tab,
        q: sp.get("q"),
        partner: sp.get("partner"),
        region: VALID_REGIONS.includes(regionParam as Region)
            ? (regionParam as Region)
            : null,
        roleType: VALID_ROLES.includes(roleParam as RoleType)
            ? (roleParam as RoleType)
            : null,
        sdm: sp.get("sdm"),
    };

    const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);

    const { rows, total } = await listRequests(user.role, user.id, filters, page);

    return NextResponse.json({
        total,
        page,
        pageSize: PAGE_SIZE,
        requests: rows,
    });
}
