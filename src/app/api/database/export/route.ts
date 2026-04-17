// src/app/api/database/export/route.ts
// GET /api/database/export?tab=...&q=...
// Streams an .xlsx file of all Employee Database records matching the filters.

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/src/lib/auth.helpers";
import { listEmployees, CHECK_CATEGORIES, CATEGORY_LABEL } from "@/src/lib/employees";
import type { EmployeeTab } from "@/src/lib/employees";

const VALID_TABS: EmployeeTab[] = ["all", "green", "amber", "red", "blacklisted"];

function pick(sp: URLSearchParams, key: string) {
    return sp.get(key) ?? undefined;
}

export async function GET(req: NextRequest) {
    let user;
    try {
        user = await requireAuth();
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const tabParam = pick(sp, "tab");
    const tab: EmployeeTab =
        tabParam && VALID_TABS.includes(tabParam as EmployeeTab)
            ? (tabParam as EmployeeTab)
            : "all";
    const q = pick(sp, "q") ?? null;

    // Fetch ALL pages (no pagination limit for export), scoped to the viewer.
    let allRows: Awaited<ReturnType<typeof listEmployees>>["rows"] = [];
    let page = 1;
    while (true) {
        const { rows, total } = await listEmployees(
            { q, tab },
            page,
            user.role,
            user.id
        );
        allRows = allRows.concat(rows);
        if (allRows.length >= total) break;
        page++;
    }

    // Build worksheet data
    const headers = [
        "Sr No",
        "Request No",
        "Candidate Name",
        "Email",
        "Partner",
        "Client Account",
        "Role",
        "Region",
        ...CHECK_CATEGORIES.map((c) => CATEGORY_LABEL[c]),
        "BGV Status",
        "BGV Letter Date",
        "Approved By",
        "Blacklisted",
    ];

    const dataRows = allRows.map((r, i) => [
        i + 1,
        r.requestNumber,
        r.candidateName,
        r.candidateEmail,
        `${r.partnerCode} – ${r.partnerName}`,
        r.clientName ?? "",
        r.roleType,
        r.region,
        ...CHECK_CATEGORIES.map((cat) => r.checksByCategory[cat] ?? "—"),
        r.status,
        r.letterIssuedDate
            ? new Date(r.letterIssuedDate).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
              })
            : "",
        r.approvedByName ?? "",
        r.isBlacklisted ? "YES" : "NO",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Column widths
    ws["!cols"] = [
        { wch: 6 },   // Sr No
        { wch: 16 },  // Request No
        { wch: 24 },  // Name
        { wch: 28 },  // Email
        { wch: 18 },  // Partner
        { wch: 22 },  // Client
        { wch: 14 },  // Role
        { wch: 12 },  // Region
        ...CHECK_CATEGORIES.map(() => ({ wch: 12 })),
        { wch: 14 },  // Status
        { wch: 16 },  // Letter Date
        { wch: 20 },  // Approved By
        { wch: 10 },  // Blacklisted
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employee Database");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `BGV_Employee_Database_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
        status: 200,
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
