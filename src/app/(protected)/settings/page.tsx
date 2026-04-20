// src/app/(protected)/settings/page.tsx
//
// HR_HEAD-only. Loads current toggle state from `app_settings` and renders
// each group with a live SettingsToggle client component (optimistic, HR-only).

import { requireAuth } from "@/src/lib/auth.helpers";
import { getAllSettings, type SettingKey } from "@/src/lib/settings";
import { getTemplateMeta, CLEARANCE_TEMPLATE_KEY } from "@/src/lib/templates";
import SettingsToggle from "@/src/components/settings/SettingsToggle";
import TemplateUploader from "@/src/components/settings/TemplateUploader";

export const dynamic = "force-dynamic";

interface ToggleDef {
    key: SettingKey;
    label: string;
    description: string;
}

const M365_TOGGLES: ToggleDef[] = [
    {
        key: "m365.sso_login",
        label: "M365 SSO Login",
        description:
            "Authenticate all internal users (SDMs, Specialists, HR) via Microsoft 365 AD",
    },
    {
        key: "m365.outlook_email",
        label: "Outlook Email Triggers",
        description:
            "Send BGV status updates, check clearances, and alerts via Outlook",
    },
    {
        key: "m365.sharepoint_storage",
        label: "SharePoint Document Storage",
        description:
            "Store BGV reports, consent forms, and clearance letters in SharePoint",
    },
];

const VENDOR_TOGGLES: ToggleDef[] = [
    {
        key: "vendor.disa",
        label: "DISA (Primary)",
        description:
            "Used for USA and most candidates. A la Carte ordering via ServiceNow integration.",
    },
    {
        key: "vendor.precisehire",
        label: "PreciseHire (Canada)",
        description:
            "Mandatory for Canada FTEs. Requires signed consent form via Adobe.",
    },
];

const NOTIFICATION_TOGGLES: ToggleDef[] = [
    {
        key: "notify.check_cleared",
        label: "Individual Check Clearance",
        description:
            "Notify requesting SDM each time a check is marked cleared + remaining checks",
    },
    {
        key: "notify.all_checks_green",
        label: "All Checks Green",
        description:
            "Notify SDM + HR Head when all checks pass — ready for BGV letter",
    },
    {
        key: "notify.check_failed",
        label: "Check Failure / Red Flag",
        description: "Immediate alert to SDM and HR Head on any failed check",
    },
    {
        key: "notify.blacklist",
        label: "Blacklist Alert",
        description: "Alert when a new request matches a blacklisted candidate",
    },
    {
        key: "notify.daily_report",
        label: "Daily Summary Report",
        description: "Auto-send daily report at 6:00 PM IST to all stakeholders",
    },
    {
        key: "notify.overdue",
        label: "Overdue Check Alert",
        description: "Alert when any check is pending for more than 5 business days",
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
            Blacklist: false,
            "Final Approval": false,
            "Generate Letter": false,
            Admin: false,
        },
    },
    {
        role: "BGV Specialist",
        perms: {
            "Submit Request": false,
            "Initiate BGV": true,
            "Update Checks": true,
            "Add Remarks": true,
            Blacklist: true,
            "Final Approval": false,
            "Generate Letter": false,
            Admin: false,
        },
    },
    {
        role: "HR Head",
        perms: {
            "Submit Request": true,
            "Initiate BGV": true,
            "Update Checks": true,
            "Add Remarks": true,
            Blacklist: true,
            "Final Approval": true,
            "Generate Letter": true,
            Admin: true,
        },
    },
];

const PERM_COLUMNS = Object.keys(ROLE_PERMS[0].perms);

export default async function SettingsPage() {
    const user = await requireAuth("HR_HEAD");
    const [settings, templateMeta] = await Promise.all([
        getAllSettings(user.id),
        getTemplateMeta(CLEARANCE_TEMPLATE_KEY, user.id),
    ]);

    const render = (defs: ToggleDef[]) =>
        defs.map((d) => (
            <SettingsToggle
                key={d.key}
                settingKey={d.key}
                label={d.label}
                description={d.description}
                initialOn={settings[d.key]}
            />
        ));

    return (
        <>
            <div className="setting-group">
                <h4>Microsoft 365 Integration</h4>
                {render(M365_TOGGLES)}
            </div>

            <div className="setting-group">
                <h4>BGV Vendor Configuration</h4>
                {render(VENDOR_TOGGLES)}
            </div>

            <div className="setting-group">
                <h4>Email Notification Rules</h4>
                {render(NOTIFICATION_TOGGLES)}
            </div>

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
                                                    color: ok
                                                        ? "var(--success)"
                                                        : "var(--text-light)",
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

            <div className="setting-group">
                <h4>BGV Clearance Letter Template</h4>
                <TemplateUploader
                    current={
                        templateMeta
                            ? {
                                  filename: templateMeta.filename,
                                  sizeBytes: templateMeta.sizeBytes,
                                  uploadedAt: templateMeta.uploadedAt.toISOString(),
                                  uploadedByName: templateMeta.uploadedByName,
                              }
                            : null
                    }
                />
            </div>
        </>
    );
}
