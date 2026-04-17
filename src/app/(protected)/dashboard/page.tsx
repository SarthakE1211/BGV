// src/app/(protected)/dashboard/page.tsx

import { requireAuth } from "@/src/lib/auth.helpers";
import {
    getDashboardStats,
    getActiveRequests,
    getPartnerBreakdown,
} from "@/src/lib/dashboard";
import StatCards from "@/src/components/dashboard/StatCards";
import PartnerBreakdown from "@/src/components/dashboard/PartnerBreakdown";
import ActiveRequestsTable from "@/src/components/dashboard/ActiveRequestsTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const user = await requireAuth();

    const [stats, breakdown, rows] = await Promise.all([
        getDashboardStats(user.role, user.id),
        getPartnerBreakdown(user.role, user.id),
        getActiveRequests(user.role, user.id, 20),
    ]);

    return (
        <>
            <StatCards stats={stats} />
            <PartnerBreakdown rows={breakdown} />
            <ActiveRequestsTable rows={rows} viewerRole={user.role} />
        </>
    );
}
