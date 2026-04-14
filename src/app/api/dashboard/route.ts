// src/app/api/dashboard/route.ts
//
// GET /api/dashboard
// Returns stat-card counts + active-requests list.
// Role-aware via requireAuth() (SDM → own data; Specialist/HR Head → all).
//
// Same shape as the guide's /api/dashboard spec:
//   { stats: { active, pending, redFlags, completed, blacklisted },
//     requests: [...] }

import { NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth.helpers";
import { getDashboardStats, getActiveRequests } from "@/src/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
    const user = await requireAuth();

    const [stats, requests] = await Promise.all([
        getDashboardStats(user.role, user.id),
        getActiveRequests(user.role, user.id, 20),
    ]);

    return NextResponse.json({ stats, requests });
}
