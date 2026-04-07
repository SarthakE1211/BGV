// src/app/(protected)/layout.tsx
import { requireAuth } from "@/src/lib/auth.helpers";
import { prisma } from "@/src/lib/prisma";
import { BGVStatus } from "@prisma/client";
import Sidebar from "@/src/components/layout/Sidebar";
import Topbar from "@/src/components/layout/Topbar";

/**
 * Protected layout — wraps every page under /(protected)/ with
 * the Sidebar and Topbar. requireAuth() redirects unauthenticated
 * users before any render happens.
 */
export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await requireAuth();
    console.log("user", user);

    // Derive initials from name (e.g. "Bilal Shaikh" → "BS")
    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    // Count pending requests for the notification badge
    // HR Head sees all pending; SDM sees only their own
    const pendingCount = await prisma.bGVRequest.count({
        where: {
            status: { in: [BGVStatus.PENDING, BGVStatus.IN_PROGRESS] },
            ...(user.role === "SDM" ? { submittedById: user.id } : {}),
        },
    });

    return (
        <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
            {/* Sidebar — sticky left panel */}
            <Sidebar
                role={user.role}
                userName={user.name}
                userEmail={user.email}
                userInitials={initials}
            />

            {/* Main content area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Topbar — sticky top bar */}
                <Topbar
                    userName={user.name}
                    userRole={user.role}
                    pendingCount={pendingCount}
                />

                {/* Page content */}
                <main
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "28px 32px",
                        background: "#f8fafc",
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}