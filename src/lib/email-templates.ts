// src/lib/email-templates.ts
//
// HTML email bodies for each trigger type.
// Returns { subject, html } ready to pass to sendEmail().

function esc(s: string): string {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function wrap(title: string, accentColor: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.08);">
  <div style="background:${accentColor};padding:24px 32px;">
    <div style="color:rgba(255,255,255,.7);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">BGV Portal</div>
    <div style="color:#fff;font-size:18px;font-weight:700;">${esc(title)}</div>
  </div>
  <div style="padding:24px 32px;">
    ${body}
  </div>
  <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
    <div style="font-size:11px;color:#9ca3af;">This is an automated notification from the BGV Portal. Please do not reply.</div>
  </div>
</div>
</body>
</html>`;
}

function infoRow(label: string, value: string): string {
    return `<tr>
      <td style="padding:6px 0;font-size:12px;color:#6b7280;width:140px;vertical-align:top;">${esc(label)}</td>
      <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${esc(value)}</td>
    </tr>`;
}

function infoTable(rows: [string, string][]): string {
    return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:16px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tbody style="background:#f9fafb;">
        ${rows.map(([l, v]) => infoRow(l, v)).join("")}
      </tbody>
    </table>`;
}

// ── REQUEST_SUBMITTED ──────────────────────────────────────────────────────────
export interface RequestSubmittedData {
    requestNumber: string;
    candidateName: string;
    candidateEmail: string;
    partnerName: string;
    partnerCode: string;
    clientAccount: string | null;
    roleType: string;
    region: string;
    submittedByName: string;
}

export function requestSubmittedEmail(d: RequestSubmittedData) {
    const subject = `New BGV Request: ${d.requestNumber} — ${d.candidateName}`;
    const html = wrap(
        "New BGV Request Submitted",
        "linear-gradient(135deg,#1e40af 0%,#3b82f6 100%)",
        `<p style="font-size:14px;color:#374151;margin:0 0 4px;">A new background verification request has been submitted and is awaiting your review.</p>
        ${infoTable([
            ["Request No.", d.requestNumber],
            ["Candidate", `${d.candidateName} (${d.candidateEmail})`],
            ["Partner", `${d.partnerCode} — ${d.partnerName}`],
            ["Client Account", d.clientAccount ?? "—"],
            ["Role Type", d.roleType],
            ["Region", d.region],
            ["Submitted By", d.submittedByName],
        ])}
        <p style="font-size:12px;color:#6b7280;margin-top:16px;">Please log in to the BGV Portal to review and process this request.</p>`
    );
    return { subject, html };
}

// ── REQUEST_APPROVED ───────────────────────────────────────────────────────────
export interface RequestApprovedData {
    requestNumber: string;
    candidateName: string;
    partnerCode: string;
    approvedByName: string;
}

export function requestApprovedEmail(d: RequestApprovedData) {
    const subject = `BGV Request Approved: ${d.requestNumber} — ${d.candidateName}`;
    const html = wrap(
        "BGV Request Approved",
        "linear-gradient(135deg,#065f46 0%,#10b981 100%)",
        `<p style="font-size:14px;color:#374151;margin:0 0 4px;">The following BGV request has been approved and will proceed to the check stage.</p>
        ${infoTable([
            ["Request No.", d.requestNumber],
            ["Candidate", d.candidateName],
            ["Partner", d.partnerCode],
            ["Approved By", d.approvedByName],
        ])}`
    );
    return { subject, html };
}

// ── CHECK_CLEARED ──────────────────────────────────────────────────────────────
export interface CheckClearedData {
    requestNumber: string;
    candidateName: string;
    checkType: string;
    remarks: string | null;
    specialistName: string;
}

export function checkClearedEmail(d: CheckClearedData) {
    const subject = `Check Cleared: ${d.checkType} — ${d.candidateName} (${d.requestNumber})`;
    const html = wrap(
        "BGV Check Cleared",
        "linear-gradient(135deg,#065f46 0%,#34d399 100%)",
        `<p style="font-size:14px;color:#374151;margin:0 0 4px;">A background check has been cleared.</p>
        ${infoTable([
            ["Request No.", d.requestNumber],
            ["Candidate", d.candidateName],
            ["Check Type", d.checkType],
            ["Remarks", d.remarks ?? "—"],
            ["Cleared By", d.specialistName],
        ])}`
    );
    return { subject, html };
}

// ── CHECK_FAILED ───────────────────────────────────────────────────────────────
export interface CheckFailedData {
    requestNumber: string;
    candidateName: string;
    checkType: string;
    remarks: string;
    specialistName: string;
}

export function checkFailedEmail(d: CheckFailedData) {
    const subject = `⚠ Check Failed: ${d.checkType} — ${d.candidateName} (${d.requestNumber})`;
    const html = wrap(
        "BGV Check Failed",
        "linear-gradient(135deg,#7f1d1d 0%,#ef4444 100%)",
        `<p style="font-size:14px;color:#374151;margin:0 0 4px;">A background check has failed and requires immediate attention.</p>
        ${infoTable([
            ["Request No.", d.requestNumber],
            ["Candidate", d.candidateName],
            ["Check Type", d.checkType],
            ["Failure Reason", d.remarks],
            ["Marked By", d.specialistName],
        ])}
        <p style="font-size:12px;color:#dc2626;margin-top:16px;font-weight:600;">Please log in to the BGV Portal to review this failure and take appropriate action.</p>`
    );
    return { subject, html };
}

// ── ALL_CHECKS_GREEN ───────────────────────────────────────────────────────────
export interface AllChecksGreenData {
    requestNumber: string;
    candidateName: string;
    candidateEmail: string;
    partnerCode: string;
    partnerName: string;
    clientAccount: string | null;
    roleType: string;
    region: string;
}

export function allChecksGreenEmail(d: AllChecksGreenData) {
    const subject = `✓ All Checks Cleared: ${d.candidateName} (${d.requestNumber})`;
    const html = wrap(
        "All BGV Checks Cleared",
        "linear-gradient(135deg,#14532d 0%,#22c55e 100%)",
        `<p style="font-size:14px;color:#374151;margin:0 0 4px;">All background checks for this candidate have been successfully cleared. The request is now <strong>GREEN</strong>.</p>
        ${infoTable([
            ["Request No.", d.requestNumber],
            ["Candidate", `${d.candidateName} (${d.candidateEmail})`],
            ["Partner", `${d.partnerCode} — ${d.partnerName}`],
            ["Client Account", d.clientAccount ?? "—"],
            ["Role Type", d.roleType],
            ["Region", d.region],
        ])}
        <p style="font-size:12px;color:#16a34a;margin-top:16px;font-weight:600;">The HR Head can now issue the BGV clearance letter from the Employee Database.</p>`
    );
    return { subject, html };
}

// ── CANDIDATE_BLACKLISTED ──────────────────────────────────────────────────────
export interface CandidateBlacklistedData {
    requestNumber: string;
    candidateName: string;
    candidateEmail: string;
    checkType: string;
    reason: string;
    markedByName: string;
}

export function candidateBlacklistedEmail(d: CandidateBlacklistedData) {
    const subject = `🚨 Candidate Blacklisted: ${d.candidateName} (${d.requestNumber})`;
    const html = wrap(
        "Candidate Blacklisted",
        "linear-gradient(135deg,#1c1917 0%,#78716c 100%)",
        `<p style="font-size:14px;color:#374151;margin:0 0 4px;">A candidate has been added to the BGV blacklist.</p>
        ${infoTable([
            ["Request No.", d.requestNumber],
            ["Candidate", `${d.candidateName} (${d.candidateEmail})`],
            ["Check Type", d.checkType],
            ["Reason", d.reason],
            ["Blacklisted By", d.markedByName],
        ])}
        <p style="font-size:12px;color:#dc2626;margin-top:16px;font-weight:600;">This candidate will be automatically flagged in future BGV requests.</p>`
    );
    return { subject, html };
}

// ── CANDIDATE_INITIATED (sent directly to the candidate) ───────────────────────
export interface CandidateInitiatedData {
    candidateName: string;
    partnerName: string;
    clientAccount: string | null;
    region: string;
    bgvVendor: "DISA" | "PRECISEHIRE";
    sdmName: string;
    sdmEmail: string;
}

export function candidateInitiatedEmail(d: CandidateInitiatedData) {
    const isCanada = d.bgvVendor === "PRECISEHIRE";
    const subject = `Your background verification has been initiated — ${d.partnerName}`;

    const vendorBlock = isCanada
        ? `<p style="font-size:13px;color:#374151;margin:14px 0 6px;">
             <strong>Next steps — Canada / PreciseHire:</strong>
           </p>
           <ol style="font-size:13px;color:#374151;padding-left:20px;margin:0;line-height:1.7;">
             <li>You will receive an email from <strong>PreciseHire</strong> with a link to begin the check.</li>
             <li>A signed consent form (via <strong>Adobe Acrobat Sign</strong>) is <strong>mandatory</strong> — please complete and return it promptly.</li>
             <li>Keep a copy of the PreciseHire email; paste the link in your browser if it does not open directly.</li>
           </ol>`
        : `<p style="font-size:13px;color:#374151;margin:14px 0 6px;">
             <strong>Next steps — DISA:</strong>
           </p>
           <ol style="font-size:13px;color:#374151;padding-left:20px;margin:0;line-height:1.7;">
             <li>You will receive an email from <strong>DISA</strong> containing a secure link.</li>
             <li>Click the link and complete the disclosure and authorization forms.</li>
             <li>Provide the requested information accurately — mismatches can delay your verification.</li>
           </ol>`;

    const html = wrap(
        "Background Verification Initiated",
        "linear-gradient(135deg,#1a365d 0%,#2a4a7f 100%)",
        `<p style="font-size:15px;color:#111827;margin:0 0 6px;">Hello ${esc(d.candidateName)},</p>
        <p style="font-size:14px;color:#374151;margin:0 0 4px;">
          We've initiated your background verification for your engagement with
          <strong>${esc(d.partnerName)}</strong>${d.clientAccount ? ` (${esc(d.clientAccount)})` : ""}.
        </p>
        ${infoTable([
            ["Partner", d.partnerName],
            ["Client Account", d.clientAccount ?? "—"],
            ["Region", d.region],
            ["BGV Vendor", isCanada ? "PreciseHire" : "DISA"],
        ])}
        ${vendorBlock}
        <p style="font-size:13px;color:#374151;margin:18px 0 4px;">
          <strong>Questions?</strong> Reach out to your SDM:
          <a href="mailto:${esc(d.sdmEmail)}" style="color:#1a365d;">${esc(d.sdmName)} &lt;${esc(d.sdmEmail)}&gt;</a>.
        </p>
        <p style="font-size:12px;color:#6b7280;margin-top:14px;">Please do not reply to this email — replies are not monitored.</p>`
    );
    return { subject, html };
}

// ── CANDIDATE_LETTER_ISSUED (sent to the candidate when the letter is issued) ─
export interface CandidateLetterIssuedData {
    candidateName: string;
    partnerName: string;
    clientAccount: string | null;
    requestNumber: string;
    letterUrl?: string | null;
    sdmName: string;
    sdmEmail: string;
}

export function candidateLetterIssuedEmail(d: CandidateLetterIssuedData) {
    const subject = `Your BGV Clearance Letter is ready — ${d.requestNumber}`;
    const linkBlock = d.letterUrl
        ? `<p style="font-size:13px;color:#374151;margin:14px 0 4px;">
             Your clearance letter is available here:
             <a href="${esc(d.letterUrl)}" style="color:#1a365d;font-weight:600;">View / Download</a>
           </p>`
        : `<p style="font-size:13px;color:#374151;margin:14px 0 4px;">
             Your SDM will share the signed copy of the clearance letter with you shortly.
           </p>`;

    const html = wrap(
        "BGV Clearance Complete",
        "linear-gradient(135deg,#065f46 0%,#10b981 100%)",
        `<p style="font-size:15px;color:#111827;margin:0 0 6px;">Hello ${esc(d.candidateName)},</p>
        <p style="font-size:14px;color:#374151;margin:0 0 4px;">
          Good news — your background verification for <strong>${esc(d.partnerName)}</strong>${
              d.clientAccount ? ` (${esc(d.clientAccount)})` : ""
          } is complete and has been cleared by HR. An official clearance letter has been issued.
        </p>
        ${infoTable([
            ["Request No.", d.requestNumber],
            ["Partner", d.partnerName],
            ["Client Account", d.clientAccount ?? "—"],
        ])}
        ${linkBlock}
        <p style="font-size:13px;color:#374151;margin:18px 0 4px;">
          <strong>Questions?</strong> Contact your SDM:
          <a href="mailto:${esc(d.sdmEmail)}" style="color:#1a365d;">${esc(d.sdmName)} &lt;${esc(d.sdmEmail)}&gt;</a>.
        </p>`
    );
    return { subject, html };
}
