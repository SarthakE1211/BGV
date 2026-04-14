// src/app/(protected)/settings/page.tsx

import { requireAuth } from "@/src/lib/auth.helpers";

export const dynamic = "force-dynamic";

// Static display of the prototype's settings groups. Toggles are not
// persisted yet; hooking them up is a follow-up wiring task.
interface ToggleItem {
    label: string;
    description: string;
    on: boolean;
}

const M365_TOGGLES: ToggleItem[] = [
    {
        label: "M365 SSO Login",
        description:
            "Authenticate all internal users (SDMs, Specialists, HR) via Microsoft 365 AD",
        on: true,
    },
    {
        label: "Outlook Email Triggers",
        description:
            "Send BGV status updates, check clearances, and alerts via Outlook",
        on: false,
    },
    {
        label: "SharePoint Document Storage",
        description:
            "Store BGV reports, consent forms, and clearance letters in SharePoint",
        on: false,
    },
];

const VENDOR_TOGGLES: ToggleItem[] = [
    {
        label: "DISA (Primary)",
        description:
            "Used for USA and most candidates. A la Carte ordering via ServiceNow integration.",
        on: true,
    },
    {
        label: "PreciseHire (Canada)",
        description:
            "Mandatory for Canada FTEs. Requires signed consent form via Adobe.",
        on: true,
    },
];

const NOTIFICATION_TOGGLES: ToggleItem[] = [
    {
        label: "Individual Check Clearance",
        description:
            "Notify requesting SDM each time a check is marked cleared + remaining checks",
        on: true,
    },
    {
        label: "All Checks Green",
        description:
            "Notify SDM + HR Head when all checks pass — ready for BGV letter",
        on: true,
    },
    {
        label: "Check Failure / Red Flag",
        description: "Immediate alert to SDM and HR Head on any failed check",
        on: true,
    },
    {
        label: "Blacklist Alert",
        description: "Alert when a new request matches a blacklisted candidate",
        on: true,
    },
    {
        label: "Daily Summary Report",
        description: "Auto-send daily report at 6:00 PM IST to all stakeholders",
        on: false,
    },
    {
        label: "Overdue Check Alert",
        description: "Alert when any check is pending for more than 5 business days",
        on: true,
    },
];

interface RoleRow {
    role: string;
    perms: Record<string, boolean>;
}

const ROLE_PERMS: RoleRow[] = [
    {
        role: "SDM",
        perms: {
            "Submit Request": true,
            "Initiate BGV": false,
            "Update Checks": false,
            "Add Remarks": false,
            "Blacklist": false,
            "Final Approval": false,
            "Generate Letter": false,
            "Admin": false,
        },
    },
    {
        role: "BGV Specialist",
        perms: {
            "Submit Request": false,
            "Initiate BGV": true,
            "Update Checks": true,
            "Add Remarks": true,
            "Blacklist": true,
            "Final Approval": false,
            "Generate Letter": false,
            "Admin": false,
        },
    },
    {
        role: "HR Head",
        perms: {
            "Submit Request": true,
            "Initiate BGV": true,
            "Update Checks": true,
            "Add Remarks": true,
            "Blacklist": true,
            "Final Approval": true,
            "Generate Letter": true,
            "Admin": true,
        },
    },
];

const PERM_COLUMNS = Object.keys(ROLE_PERMS[0].perms);

export default async function SettingsPage() {
    await requireAuth("HR_HEAD");

    return (
        <>
            {/* M365 */}
            <SettingGroup title="Microsoft 365 Integration">
                {M365_TOGGLES.map((t) => (
                    <SettingRow key={t.label} item={t} />
                ))}
            </SettingGroup>

            {/* Vendors */}
            <SettingGroup title="BGV Vendor Configuration">
                {VENDOR_TOGGLES.map((t) => (
                    <SettingRow key={t.label} item={t} />
                ))}
            </SettingGroup>

            {/* Notifications */}
            <SettingGroup title="Email Notification Rules">
                {NOTIFICATION_TOGGLES.map((t) => (
                    <SettingRow key={t.label} item={t} />
                ))}
            </SettingGroup>

            {/* Roles & access */}
            <div className="setting-group">
                <h4>Roles & Access Control</h4>
                <div className="table-scroll" style={{ marginTop: 6 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Role</th>
                                {PERM_COLUMNS.map((col) => (
                                    <th key={col}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ROLE_PERMS.map((row) => (
                                <tr key={row.role}>
                                    <td>
                                        <strong>{row.role}</strong>
                                    </td>
                                    {PERM_COLUMNS.map((col) => {
                                        const ok = row.perms[col];
                                        return (
                                            <td
                                                key={col}
                                                style={{
                                                    color: ok ? "var(--success)" : "var(--text-light)",
                                                    fontWeight: ok ? 600 : 400,
                                                }}
                                            >
                                                {ok ? "Yes" : "No"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Letter template */}
            <div className="setting-group">
                <h4>BGV Clearance Letter Template</h4>
                <p
                    style={{
                        fontSize: 12,
                        color: "var(--text-light)",
                        marginBottom: 8,
                    }}
                >
                    Upload the template that gets auto-populated when all checks are Green
                    and HR Head approves.
                </p>
                <button className="btn btn-outline btn-sm" disabled>
                    Upload Template (.docx)
                </button>
                <span
                    style={{
                        fontSize: 11,
                        color: "var(--text-light)",
                        marginLeft: 8,
                    }}
                >
                    Pending — you&apos;ll share this later
                </span>
            </div>
        </>
    );
}

function SettingGroup({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="setting-group">
            <h4>{title}</h4>
            {children}
        </div>
    );
}

function SettingRow({ item }: { item: ToggleItem }) {
    return (
        <div className="setting-row">
            <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-light)" }}>
                    {item.description}
                </div>
            </div>
            <div
                className={`toggle ${item.on ? "on" : ""}`}
                aria-label={item.on ? "Enabled" : "Disabled"}
                role="img"
            />
        </div>
    );
}
