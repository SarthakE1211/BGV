/**
 * Generates sample-clearance-template.docx in the project root.
 *
 *   npm run template:sample
 *
 * Upload the resulting file at /settings → BGV Clearance Letter Template.
 * All {{PLACEHOLDERS}} will be replaced with real request data when HR Head
 * clicks "Generate" on a GREEN + approved request.
 */
import PizZip from "pizzip";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:style>
</w:styles>`;

// Short helpers for docx paragraph XML.
const para = (text: string, opts: { bold?: boolean; size?: number; center?: boolean } = {}) => {
    const align = opts.center
        ? `<w:pPr><w:jc w:val="center"/></w:pPr>`
        : `<w:pPr/>`;
    const rPr = [
        opts.bold ? `<w:b/>` : "",
        opts.size ? `<w:sz w:val="${opts.size}"/>` : "",
    ].join("");
    const run = rPr
        ? `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>`
        : `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`;
    return `<w:p>${align}${run}</w:p>`;
};

const blank = () => `<w:p><w:pPr/></w:p>`;

const DOCUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${para("OVATION WORKPLACE SERVICES", { bold: true, size: 36, center: true })}
    ${para("Background Verification Clearance Letter", { size: 24, center: true })}
    ${blank()}
    ${para("Reference: {{REQUEST_NUMBER}}")}
    ${para("Issued: {{ISSUE_DATE}}")}
    ${blank()}
    ${para("To Whom It May Concern,", { bold: true })}
    ${blank()}
    ${para("This is to certify that {{CANDIDATE_NAME}} ({{CANDIDATE_EMAIL}}) has successfully completed the Background Verification process for engagement with {{PARTNER_NAME}} ({{CLIENT_ACCOUNT}}) in the role of {{ROLE_TYPE}}, region {{REGION}}.")}
    ${blank()}
    ${para("BGV Details", { bold: true, size: 26 })}
    ${para("Partner: {{PARTNER_NAME}} ({{PARTNER_CODE}})")}
    ${para("Client Account: {{CLIENT_ACCOUNT}}")}
    ${para("Role Type: {{ROLE_TYPE}}")}
    ${para("Region: {{REGION}}")}
    ${para("BGV Vendor: {{BGV_VENDOR}}")}
    ${para("Initiated: {{INITIATION_DATE}}")}
    ${para("Completed: {{COMPLETION_DATE}}")}
    ${para("Submitted By: {{SUBMITTED_BY}}")}
    ${para("Approved By: {{APPROVED_BY}} on {{APPROVAL_DATE}}")}
    ${blank()}
    ${para("Summary of Verification Checks", { bold: true, size: 26 })}
    ${para("{{CHECKS_SUMMARY}}")}
    ${blank()}
    ${para("Based on the background verification checks performed and the clearance of all mandatory items, this candidate is cleared for engagement effective {{COMPLETION_DATE}}.")}
    ${blank()}
    ${para("Sincerely,")}
    ${blank()}
    ${blank()}
    ${para("{{APPROVED_BY}}", { bold: true })}
    ${para("HR Head, Ovation Workplace Services")}
    ${blank()}
    ${para("— This is a system-generated document. —", { size: 18, center: true })}
  </w:body>
</w:document>`;

function main() {
    const zip = new PizZip();
    zip.file("[Content_Types].xml", CONTENT_TYPES);
    zip.file("_rels/.rels", ROOT_RELS);
    zip.file("word/document.xml", DOCUMENT);
    zip.file("word/_rels/document.xml.rels", DOC_RELS);
    zip.file("word/styles.xml", STYLES);

    const buf = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
    const out = resolve(process.cwd(), "sample-clearance-template.docx");
    writeFileSync(out, buf);
    console.log(`✓ Wrote ${out} (${(buf.length / 1024).toFixed(1)} KB)`);
    console.log(
        `\nNext steps:\n  1. Open the file in Word to verify it looks right.\n  2. /settings → BGV Clearance Letter Template → Upload.\n  3. Generate any GREEN + approved request — the placeholders get filled in.\n`
    );
}

main();
