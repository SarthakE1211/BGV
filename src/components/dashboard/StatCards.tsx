// src/components/dashboard/StatCards.tsx

import type { DashboardStats } from "@/src/lib/dashboard";

const MONTH_LABEL = new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
});

export default function StatCards({ stats }: { stats: DashboardStats }) {
    return (
        <div className="stats-grid">
            <div className="stat-card">
                <div className="stat-label">Active BGV Requests</div>
                <div className="stat-value color-primary">
                    {stats.active.toLocaleString()}
                </div>
                <div className="stat-sub">Across all partners</div>
            </div>

            <div className="stat-card">
                <div className="stat-label">Pending Individual Checks</div>
                <div className="stat-value color-warning">
                    {stats.pendingChecks.toLocaleString()}
                </div>
                <div className="stat-sub">
                    {stats.overdueChecks} overdue (&gt;5 days)
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-label">Completed This Month</div>
                <div className="stat-value color-success">
                    {stats.completed.toLocaleString()}
                </div>
                <div className="stat-sub">Green status in tracker</div>
            </div>

            <div className="stat-card">
                <div className="stat-label">Failed / Red Flag</div>
                <div className="stat-value color-danger">
                    {stats.redFlags.toLocaleString()}
                </div>
                <div className="stat-sub">
                    {stats.blacklisted} blacklisted
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-label">BGV Letters Issued</div>
                <div className="stat-value color-accent">
                    {stats.lettersIssued.toLocaleString()}
                </div>
                <div className="stat-sub">{MONTH_LABEL}</div>
            </div>
        </div>
    );
}
