// src/app/(protected)/database/page.tsx

import { requireAuth } from "@/src/lib/auth.helpers";
import {
    listEmployees,
    getEmployeeTabCounts,
    PAGE_SIZE,
    type EmployeeTab,
} from "@/src/lib/employees";
import EmployeeTabs from "@/src/components/employees/EmployeeTabs";
import EmployeeSearch from "@/src/components/employees/EmployeeSearch";
import EmployeeTable from "@/src/components/employees/EmployeeTable";
import RequestsPagination from "@/src/components/requests/RequestsPagination";

export const dynamic = "force-dynamic";

const VALID_TABS: EmployeeTab[] = ["all", "green", "amber", "red", "blacklisted"];

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}
function pick(sp: Record<string, string | string[] | undefined>, key: string) {
    const v = sp[key];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
}

export default async function DatabasePage({ searchParams }: PageProps) {
    await requireAuth();
    const sp = await searchParams;

    const tabParam = pick(sp, "tab");
    const tab: EmployeeTab =
        tabParam && VALID_TABS.includes(tabParam as EmployeeTab)
            ? (tabParam as EmployeeTab)
            : "all";

    const page = Math.max(1, Number(pick(sp, "page") ?? 1) || 1);

    const [{ rows, total }, counts] = await Promise.all([
        listEmployees({ q: pick(sp, "q") ?? null, tab }, page),
        getEmployeeTabCounts(),
    ]);

    return (
        <>
            <EmployeeSearch />
            <EmployeeTabs counts={counts} />
            <div className="info-box info-blue" style={{ marginBottom: 14 }}>
                <strong>Database mirrors your Master Tracker.</strong> Searchable by
                name, email, partner, client account, or BGV ID. When all checks are
                Green, click &quot;Generate&quot; to produce the BGV clearance letter.
            </div>
            <EmployeeTable rows={rows} />
            <RequestsPagination page={page} total={total} pageSize={PAGE_SIZE} />
        </>
    );
}
