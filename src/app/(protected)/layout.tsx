// src/app/(protected)/layout.tsx

import { requireAuth } from "@/src/lib/auth.helpers";
import { api } from "@/src/lib/api-client";
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

    // Get pending count from Django tab_counts endpoint (role-scoped).
    let pendingCount = 0;
    try {
        const counts = await api<{ all?: number }>("/bgv/requests/tab_counts/", {
            userId: user.id,
        });
        pendingCount = Number(counts.all ?? 0);
    } catch {
        // Graceful fallback — sidebar still renders, badge shows 0.
    }

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
