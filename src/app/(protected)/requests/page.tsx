// src/app/(protected)/requests/page.tsx

import { requireAuth } from "@/src/lib/auth.helpers";
import {
    listRequests,
    getTabCounts,
    getPartnerOptions,
    getSDMOptions,
    PAGE_SIZE,
    type RequestsTab,
    type ListFilters,
} from "@/src/lib/requests";
import type { Region, RoleType } from "@/src/lib/enums";
import RequestsToolbar from "@/src/components/requests/RequestsToolbar";
import RequestsFilters from "@/src/components/requests/RequestsFilters";
import RequestsTable from "@/src/components/requests/RequestsTable";
import RequestsPagination from "@/src/components/requests/RequestsPagination";

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

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pick(sp: Record<string, string | string[] | undefined>, key: string) {
    const v = sp[key];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
}

export default async function RequestsPage({ searchParams }: PageProps) {
    const user = await requireAuth();
    const sp = await searchParams;

    const tabParam = pick(sp, "tab");
    const tab: RequestsTab =
        tabParam && VALID_TABS.includes(tabParam as RequestsTab)
            ? (tabParam as RequestsTab)
            : "all";

    const regionParam = pick(sp, "region");
    const roleParam = pick(sp, "roleType");

    const filters: ListFilters = {
        tab,
        q: pick(sp, "q") ?? null,
        partner: pick(sp, "partner") ?? null,
        region: VALID_REGIONS.includes(regionParam as Region)
            ? (regionParam as Region)
            : null,
        roleType: VALID_ROLES.includes(roleParam as RoleType)
            ? (roleParam as RoleType)
            : null,
        sdm: pick(sp, "sdm") ?? null,
    };

    const page = Math.max(1, Number(pick(sp, "page") ?? 1) || 1);

    const [listResult, tabCounts, partners, sdms] = await Promise.all([
        listRequests(user.role, user.id, filters, page),
        getTabCounts(user.role, user.id),
        getPartnerOptions(),
        user.role === "SDM" ? Promise.resolve([]) : getSDMOptions(),
    ]);

    return (
        <>
            <RequestsToolbar tabCounts={tabCounts} />
            <RequestsTable
                rows={listResult.rows}
                page={listResult.page}
                pageSize={PAGE_SIZE}
                filtersSlot={
                    <RequestsFilters partners={partners} sdms={sdms} role={user.role} />
                }
            />
            <RequestsPagination
                page={listResult.page}
                total={listResult.total}
                pageSize={PAGE_SIZE}
            />
        </>
    );
}
