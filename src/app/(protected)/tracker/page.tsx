// src/app/(protected)/tracker/page.tsx

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth.helpers";
import {
    listChecks,
    getCheckTabCounts,
    getSpecialistOptions,
    PAGE_SIZE,
    type CheckTab,
    type TrackerFilters as TrackerFilterParams,
} from "@/src/lib/tracker";
import { getPartnerOptions } from "@/src/lib/requests";
import type { CheckStatus } from "@/src/lib/enums";
import TrackerTabs from "@/src/components/tracker/TrackerTabs";
import TrackerFilters from "@/src/components/tracker/TrackerFilters";
import TrackerTable from "@/src/components/tracker/TrackerTable";
import RequestsPagination from "@/src/components/requests/RequestsPagination";

export const dynamic = "force-dynamic";

const VALID_TABS: CheckTab[] = [
    "all",
    "criminal",
    "education",
    "employment",
    "drug",
    "ssn",
    "credit",
    "specialized",
];
const VALID_STATUSES: CheckStatus[] = ["PENDING", "IN_PROGRESS", "CLEARED", "FAILED"];

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pick(sp: Record<string, string | string[] | undefined>, key: string) {
    const v = sp[key];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
}

export default async function TrackerPage({ searchParams }: PageProps) {
    const user = await requireAuth();
    if (user.role === "SDM") redirect("/dashboard");

    const sp = await searchParams;

    const tabParam = pick(sp, "tab");
    const tab: CheckTab =
        tabParam && VALID_TABS.includes(tabParam as CheckTab)
            ? (tabParam as CheckTab)
            : "all";

    const statusParam = pick(sp, "status");
    const filters: TrackerFilterParams = {
        tab,
        q: pick(sp, "q") ?? null,
        partner: pick(sp, "partner") ?? null,
        specialist: pick(sp, "specialist") ?? null,
        status: VALID_STATUSES.includes(statusParam as CheckStatus)
            ? (statusParam as CheckStatus)
            : null,
    };
    const page = Math.max(1, Number(pick(sp, "page") ?? 1) || 1);

    const [{ rows, total }, counts, partners, specialists] = await Promise.all([
        listChecks(filters, page, user.id),
        getCheckTabCounts(user.id),
        getPartnerOptions(user.id),
        getSpecialistOptions(user.id),
    ]);

    return (
        <>
            <TrackerTabs counts={counts} />
            <TrackerTable
                rows={rows}
                viewerRole={user.role}
                specialists={specialists}
                filtersSlot={
                    <TrackerFilters partners={partners} specialists={specialists} />
                }
            />
            <RequestsPagination page={page} total={total} pageSize={PAGE_SIZE} />
        </>
    );
}
