// src/lib/letter.ts
//
// Pure renderer for the BGV Clearance Letter. Called from:
//   - src/actions/requests.ts  (at generation time — writes output to DB + Blob)
//   - src/app/api/requests/[id]/letter/route.ts  (live-render fallback)
//
// No I/O — takes the already-loaded request + checks rows and returns the
// finished HTML string.

import type {
    RequestDetailRow,
    CheckDetailRow,
} from "@/src/lib/request-detail";

function fmtDate(d: Date | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function esc(s: string | null | undefined) {
    if (!s) return "";
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function renderClearanceLetterHtml(
    request: RequestDetailRow,
    checks: CheckDetailRow[]
): string {
    const checksRows = checks
        .map(
            (c) => `
            <tr>
                <td>${esc(c.checkType)}</td>
                <td>${esc(c.requirementSource ?? "—")}</td>
                <td>${esc(c.status)}</td>
                <td>${fmtDate(c.completedAt)}</td>
            </tr>`
        )
        .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BGV Clearance Letter — ${esc(request.candidate.name)}</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; color:#1e293b; max-width:800px; margin:40px auto; padding:0 40px; line-height:1.6; }
  header { border-bottom:3px solid #1a365d; padding-bottom:14px; margin-bottom:24px; }
  header h1 { color:#1a365d; font-size:22px; margin:0; }
  header .sub { color:#64748b; font-size:13px; }
  h2 { color:#1a365d; font-size:16px; margin-top:24px; border-bottom:1px solid #e2e8f0; padding-bottom:6px; }
  .meta { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; font-size:13px; margin:14px 0 20px; }
  .meta div strong { color:#334155; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin-top:10px; }
  th, td { border:1px solid #e2e8f0; padding:6px 10px; text-align:left; }
  th { background:#f1f5f9; color:#1a365d; }
  .statement { background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #22c55e; padding:14px 18px; margin:18px 0; font-size:13px; }
  .footer { margin-top:40px; font-size:12px; color:#64748b; display:flex; justify-content:space-between; border-top:1px solid #e2e8f0; padding-top:14px; }
  .actions { margin-bottom:14px; display:flex; gap:8px; }
  .actions button { padding:6px 14px; border:1px solid #cbd5e1; background:#fff; border-radius:6px; cursor:pointer; font-size:12px; }
  @media print { .actions { display:none; } body { margin:20px; } }
</style>
</head>
<body>
<div class="actions">
  <button onclick="window.print()">Print / Save as PDF</button>
  <button onclick="window.close()">Close</button>
</div>

<header>
  <h1>Ovation Workplace Services</h1>
  <div class="sub">Background Verification Clearance Letter</div>
</header>

<div><strong>Reference:</strong> ${esc(request.requestNumber)}</div>
<div><strong>Issued:</strong> ${fmtDate(new Date())}</div>

<h2>Candidate Information</h2>
<div class="meta">
  <div><strong>Full Name:</strong> ${esc(request.candidate.name)}</div>
  <div><strong>Email:</strong> ${esc(request.candidate.email)}</div>
  <div><strong>Phone:</strong> ${esc(request.candidate.phone ?? "—")}</div>
  <div><strong>Role Type:</strong> ${esc(request.roleType)}</div>
  <div><strong>Region:</strong> ${esc(request.region)}</div>
  <div><strong>BGV Vendor:</strong> ${esc(request.bgvVendor)}</div>
</div>

<h2>Engagement Details</h2>
<div class="meta">
  <div><strong>ITO Partner:</strong> ${esc(request.partner.name)}</div>
  <div><strong>Client Account:</strong> ${esc(request.client?.name ?? request.clientAccount ?? "—")}</div>
  <div><strong>Initiated:</strong> ${fmtDate(request.initiationDate)}</div>
  <div><strong>Completed:</strong> ${fmtDate(request.completionDate)}</div>
  <div><strong>Approved By:</strong> ${esc(request.approvedBy?.name ?? "—")}</div>
  <div><strong>Submitted By:</strong> ${esc(request.submittedBy.name)}</div>
</div>

<div class="statement">
  <strong>Clearance Statement:</strong> Based on the background verification checks
  performed and the clearance of all mandatory items, this candidate is cleared for
  engagement with ${esc(request.partner.name)}${
      request.client?.name ? ` (${esc(request.client.name)})` : ""
  } effective ${fmtDate(request.completionDate)}.
</div>

<h2>Verification Checks Performed</h2>
<table>
  <thead>
    <tr><th>Check Type</th><th>Requirement Source</th><th>Status</th><th>Completed</th></tr>
  </thead>
  <tbody>
    ${checksRows || '<tr><td colspan="4" style="text-align:center">No checks recorded.</td></tr>'}
  </tbody>
</table>

<div class="footer">
  <div>Ovation Workplace Services — BGV Portal v1.0</div>
  <div>Generated on ${fmtDate(new Date())}</div>
</div>

</body>
</html>`;
}

export function letterBlobName(requestNumber: string, candidateName: string): string {
    const safeName = candidateName.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 60);
    return `letters/${requestNumber}-${safeName}.html`;
}
