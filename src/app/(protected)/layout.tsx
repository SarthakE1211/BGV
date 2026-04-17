// src/app/(protected)/layout.tsx

import { requireAuth } from "@/src/lib/auth.helpers";
import { queryOne } from "@/src/lib/db";
import Sidebar from "@/src/components/layout/Sidebar";
import Topbar from "@/src/components/layout/Topbar";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await requireAuth();

    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const row = await queryOne<{ n: number }>(
        user.role === "SDM"
            ? `SELECT COUNT(*) AS n FROM bgv_requests WHERE submitted_by_id = ?`
            : user.role === "SPECIALIST"
              ? `SELECT COUNT(*) AS n FROM bgv_requests WHERE assigned_specialist_id = ?`
              : `SELECT COUNT(*) AS n FROM bgv_requests`,
        user.role === "HR_HEAD" ? [] : [user.id]
    );
    const pendingCount = Number(row?.n ?? 0);

    return (
        <>
            <Sidebar
                role={user.role}
                userName={user.name}
                userEmail={user.email}
                userInitials={initials}
                userImage={user.image}
                pendingCount={pendingCount}
            />
            <div className="main">
                <Topbar role={user.role} />
                <div className="content">{children}</div>
            </div>
        </>
    );
}
