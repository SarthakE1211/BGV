// src/lib/report-email.ts
//
// Builds the HTML body for the daily BGV status email.
// Kept in a separate file so both the preview route and the send action share it.

import type { DailySummary, PartnerProgressRow, OverdueRow } from "@/src/lib/report";

export interface ReportEmailData {
    summary: DailySummary;
    partners: PartnerProgressRow[];
    overdue: OverdueRow[];
    dateLabel: string;
    overdueThreshold: number;
}

const PARTNER_COLOR: Record<string, string> = {
    HCL: "#3b82f6",
    COG: "#7c3aed",
    LTM: "#0891b2",
    TCS: "#ea580c",
    WIP: "#db2777",
    HEX: "#059669",
    BIR: "#ca8a04",
    MIN: "#4f46e5",
};

export function buildDailyReportHtml(d: ReportEmailData): string {
    const max = Math.max(1, ...d.partners.map((p) => p.active));

    const partnerRows = d.partners
        .map((p) => {
            const pct = Math.round((p.active / max) * 100);
            const color = PARTNER_COLOR[p.code] ?? "#6366f1";
            return `
            <tr>
                <td style="padding:6px 10px;font-size:13px;white-space:nowrap;width:110px;font-weight:600;">${p.name}</td>
                <td style="padding:6px 10px;">
                    <div style="background:#e5e7eb;border-radius:4px;height:12px;width:100%;min-width:160px;">
                        <div style="background:${color};border-radius:4px;height:12px;width:${pct}%;"></div>
                    </div>
                </td>
                <td style="padding:6px 10px;font-size:12px;color:#6b7280;text-align:right;white-space:nowrap;">${p.active} active</td>
            </tr>`;
        })
        .join("");

    const overdueRows =
        d.overdue.length === 0
            ? `<tr><td colspan="6" style="padding:16px;text-align:center;color:#16a34a;font-size:13px;">✓ No overdue checks</td></tr>`
            : d.overdue
                  .slice(0, 20)
                  .map(
                      (o) => `
            <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:7px 10px;font-size:12px;">${esc(o.candidateName)}</td>
                <td style="padding:7px 10px;font-size:12px;">${esc(o.partnerCode)}</td>
                <td style="padding:7px 10px;font-size:12px;">${esc(o.clientName ?? "—")}</td>
                <td style="padding:7px 10px;font-size:12px;">${esc(o.checkType)}</td>
                <td style="padding:7px 10px;font-size:12px;font-weight:700;color:${o.daysOverdue > 7 ? "#dc2626" : "#d97706"};">${o.daysOverdue}d</td>
                <td style="padding:7px 10px;font-size:12px;">${esc(o.assignedTo ?? "Unassigned")}</td>
            </tr>`
                  )
                  .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:680px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:28px 32px;">
    <div style="color:#bfdbfe;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">BGV Portal</div>
    <div style="color:#fff;font-size:22px;font-weight:700;">Daily BGV Status Report</div>
    <div style="color:#93c5fd;font-size:13px;margin-top:4px;">${esc(d.dateLabel)}</div>
  </div>

  <!-- Summary metrics -->
  <div style="padding:24px 32px;">
    <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px;">Summary</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        ${metricCell("Total Active", d.summary.totalActive, "#1d4ed8")}
        ${metricCell("Completed Today", d.summary.completedToday, "#16a34a")}
        ${metricCell("New Requests", d.summary.newRequestsToday, "#7c3aed")}
        ${metricCell(`Overdue (>${d.overdueThreshold}d)`, d.summary.overdueChecks, d.summary.overdueChecks > 0 ? "#dc2626" : "#6b7280")}
        ${metricCell("Letters Issued", d.summary.lettersIssuedToday, "#0891b2")}
      </tr>
    </table>
  </div>

  <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 32px;">

  <!-- Partner progress -->
  <div style="padding:24px 32px;">
    <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px;">Pending BGVs by Partner</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${partnerRows}
    </table>
  </div>

  <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 32px;">

  <!-- Overdue -->
  <div style="padding:24px 32px;">
    <div style="font-size:13px;font-weight:600;color:#dc2626;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px;">
      ⚠ Overdue Items — Requires Immediate Attention
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#fef2f2;border-bottom:2px solid #fecaca;">
          <th style="padding:7px 10px;text-align:left;color:#991b1b;font-weight:600;">Technician</th>
          <th style="padding:7px 10px;text-align:left;color:#991b1b;font-weight:600;">Partner</th>
          <th style="padding:7px 10px;text-align:left;color:#991b1b;font-weight:600;">Account</th>
          <th style="padding:7px 10px;text-align:left;color:#991b1b;font-weight:600;">Check</th>
          <th style="padding:7px 10px;text-align:left;color:#991b1b;font-weight:600;">Days</th>
          <th style="padding:7px 10px;text-align:left;color:#991b1b;font-weight:600;">Assigned</th>
        </tr>
      </thead>
      <tbody>
        ${overdueRows}
      </tbody>
    </table>
    ${d.overdue.length > 20 ? `<div style="font-size:11px;color:#6b7280;margin-top:8px;">… and ${d.overdue.length - 20} more. Log in to view all.</div>` : ""}
  </div>

  <!-- Footer -->
  <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
    <div style="font-size:11px;color:#9ca3af;">
      This report was auto-generated by the BGV Portal.
      Please do not reply to this email.
    </div>
  </div>

</div>
</body>
</html>`;
}

function metricCell(label: string, value: number, color: string): string {
    return `<td style="padding:0 8px 0 0;vertical-align:top;width:20%;">
      <div style="background:#f9fafb;border-radius:8px;padding:14px 12px;text-align:center;border:1px solid #e5e7eb;">
        <div style="font-size:26px;font-weight:800;color:${color};line-height:1;">${value}</div>
        <div style="font-size:10px;color:#6b7280;margin-top:4px;line-height:1.3;">${label}</div>
      </div>
    </td>`;
}

function esc(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
