/**
 * Seeds partners + their client-account check matrices using the exact
 * requirement labels from BGV_Portal_Prototype.html §Partners & Checks.
 * Safe to re-run — uses INSERT … ON DUPLICATE KEY UPDATE.
 *
 *   npm run db:seed
 */
import { createConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { config as loadEnv } from "dotenv";
import { randomBytes } from "node:crypto";

loadEnv({ path: ".env.local" });
loadEnv();

function cuid(): string {
    return "c" + Date.now().toString(36) + randomBytes(8).toString("hex");
}

// ─── Per-partner standard (MSA Default) check lists ───────────────────────────
// These are the checks the portal auto-loads when the SDM does NOT pick a
// specific end-client. Sourced from the prototype.
const PARTNERS: Array<{ code: string; name: string; standardChecks: string[] }> = [
    {
        code: "HCL",
        name: "HCL Technologies",
        standardChecks: [
            "Previous Employment",
            "Eligibility for Work",
            "Criminal (Local Law)",
            "Education Check",
            "Financial/Credit Check",
            "Drug Screening",
        ],
    },
    {
        code: "COG",
        name: "Cognizant",
        // Per prototype fallback for Cognizant when no specific client is picked.
        standardChecks: ["Criminal", "Drug Test", "ID Verification"],
    },
    {
        code: "LTM",
        name: "LTIMindtree",
        standardChecks: ["Criminal", "Drug Test", "Education", "Employment"],
    },
    {
        code: "TCS",
        name: "Tata Consultancy Services",
        standardChecks: ["Criminal", "Drug Test", "Education", "Employment"],
    },
    {
        code: "WIP",
        name: "Wipro",
        // Wipro's MSA is the slimmest — just two checks per the prototype card.
        standardChecks: ["Criminal Check", "ID Verification"],
    },
    {
        code: "HEX",
        name: "Hexaware",
        standardChecks: ["Criminal", "Drug Test", "Education", "Employment"],
    },
    {
        code: "BIR",
        name: "Birlasoft",
        standardChecks: ["Criminal", "Drug Test", "Education", "Employment"],
    },
    {
        code: "MIN",
        name: "Mindtree",
        standardChecks: ["Criminal", "Drug Test", "Education", "Employment"],
    },
];

// ─── Client-specific matrices (override + extend partner standard) ────────────
interface ClientSeed {
    partnerCode: string;
    clientName: string;
    specialNotes?: string;
    usa: string[];
    canada: string[];
    latam: string[];
}

// HCL-standard base kept as a const so we can spread into each HCL client.
const HCL_STD = [
    "Previous Employment",
    "Eligibility for Work",
    "Criminal (Local Law)",
    "Education Check",
    "Financial/Credit Check",
    "Drug Screening",
];

const CLIENT_SEED: ClientSeed[] = [
    // ─── HCL client matrices ──────────────────────────────────────────────
    {
        partnerCode: "HCL",
        clientName: "Merck",
        specialNotes: "Standard HCL + Merck-specific additions (pharma)",
        usa: [
            ...HCL_STD,
            "Extended Drug Panel (10-panel)",
            "Global Sanctions/OFAC Check",
        ],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "HCL",
        clientName: "Ascension",
        specialNotes: "Healthcare client — extensive requirements",
        usa: [
            "SSN Validation",
            "Criminal",
            "Address",
            "OFAC",
            "Sex Offender Registry",
            "Education",
            "Employment",
            "Drug Test",
            "DMV",
            "Vaccination (MMR, Hep B, COVID)",
            "TB Screening",
            "Negative UDS",
        ],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "HCL",
        clientName: "GSK",
        specialNotes: "Pharma — includes Canada variant via PreciseHire",
        usa: [
            "Employment (5yr)",
            "Education",
            "References (2)",
            "Debarment/Sanctions",
            "CV Validation",
            "Drug Test",
        ],
        canada: [
            "Employment (5yr)",
            "Education",
            "References (2)",
            "Debarment/Sanctions",
            "CV Validation",
            "Signed Consent Form (Adobe)",
            "Passport Validation",
            "Interpol Check",
        ],
        latam: [],
    },
    {
        partnerCode: "HCL",
        clientName: "Akzonobel",
        usa: HCL_STD,
        canada: [],
        latam: [],
    },
    {
        partnerCode: "HCL",
        clientName: "Arizona Public Service",
        usa: HCL_STD,
        canada: [],
        latam: [],
    },
    {
        partnerCode: "HCL",
        clientName: "Barclays",
        usa: [...HCL_STD, "FINRA Background", "Global Sanctions/OFAC Check"],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "HCL",
        clientName: "BD",
        usa: HCL_STD,
        canada: [],
        latam: [],
    },
    {
        partnerCode: "HCL",
        clientName: "BMS",
        usa: [...HCL_STD, "Global Sanctions/OFAC Check", "Debarment/Sanctions"],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "HCL",
        clientName: "NVIDIA",
        usa: HCL_STD,
        canada: [],
        latam: [],
    },
    {
        partnerCode: "HCL",
        clientName: "Pfizer",
        usa: [...HCL_STD, "Global Sanctions/OFAC Check", "Debarment/Sanctions"],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "HCL",
        clientName: "Tenet Healthcare",
        specialNotes: "Healthcare — vaccination + sanctions required",
        usa: [
            ...HCL_STD,
            "Vaccination (MMR, Hep B, COVID)",
            "TB Screening",
            "OFAC",
            "Sex Offender Registry",
        ],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "HCL",
        clientName: "USRS",
        usa: HCL_STD,
        canada: [],
        latam: [],
    },

    // ─── Cognizant client matrices ────────────────────────────────────────
    {
        partnerCode: "COG",
        clientName: "ServiceNow",
        specialNotes: "Region-specific check matrices",
        usa: [
            "SSN Trace",
            "7yr Criminal",
            "7yr Employment",
            "Nationwide Criminal",
            "FACIS-1",
            "Global Sanctions",
            "Drug Test",
        ],
        canada: [
            "SSN Trace",
            "Criminal (National + US County)",
            "7yr Employment",
            "Nationwide Criminal",
            "FACIS-1",
            "Global Sanctions",
        ],
        latam: [
            "Global Sanction",
            "7yr Employment",
            "Interpol",
            "Passport Validation",
        ],
    },
    {
        partnerCode: "COG",
        clientName: "Fortrea",
        specialNotes: "Healthcare — most extensive COG check matrix",
        usa: [
            "5yr Employment",
            "Education",
            "FACIS",
            "Criminal",
            "Professional License",
            "Driving",
            "Global Sanction",
            "Bankruptcy",
            "Sex Offender Registry",
            "10-Panel Drug",
            "Identity",
            "Debarment",
            "OIG/HHS",
            "SSN CBSV",
        ],
        canada: [
            "Interpol",
            "Passport",
            "Education",
            "5yr Employment",
            "FACIS",
            "Criminal",
        ],
        latam: [],
    },
    {
        partnerCode: "COG",
        clientName: "JLL",
        usa: ["Criminal", "Drug Test", "ID Verification", "Employment", "Education"],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "COG",
        clientName: "McCormick",
        usa: ["Criminal", "Drug Test", "ID Verification", "Employment", "Reference Check"],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "COG",
        clientName: "HAYS",
        usa: ["Criminal", "Drug Test", "ID Verification", "Employment"],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "COG",
        clientName: "CNO",
        usa: ["Criminal", "Drug Test", "ID Verification", "Employment", "Education"],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "COG",
        clientName: "J&J",
        specialNotes: "Pharma — includes sanctions & debarment",
        usa: [
            "Criminal",
            "Drug Test",
            "Identity",
            "Employment",
            "Education",
            "Global Sanction",
            "Debarment",
        ],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "COG",
        clientName: "T&R",
        usa: ["Criminal", "Drug Test", "ID Verification", "Employment"],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "COG",
        clientName: "Merchant Fleet",
        usa: ["Criminal", "Drug Test", "ID Verification", "Driving", "Employment"],
        canada: [],
        latam: [],
    },

    // ─── LTIMindtree client matrices ──────────────────────────────────────
    {
        partnerCode: "LTM",
        clientName: "Eversource",
        specialNotes: "Full check suite including OFAC",
        usa: [
            "ID (Official w/ Photo)",
            "SSN Validation",
            "Education (College+Grad)",
            "7yr Criminal & Address",
            "Employment (per JD)",
            "OFAC/Global Watchlist",
            "10-Panel Drug",
        ],
        canada: [],
        latam: [],
    },
    {
        partnerCode: "LTM",
        clientName: "Bird Electric",
        usa: [
            "ID (Official w/ Photo)",
            "SSN Validation",
            "Criminal",
            "Employment",
            "Drug Test",
        ],
        canada: [],
        latam: [],
    },

    // ─── TCS client matrices ──────────────────────────────────────────────
    {
        partnerCode: "TCS",
        clientName: "Hertz",
        specialNotes: "Includes DMV for driving-related roles",
        usa: ["Criminal", "Drug Test", "ID Verification", "Employment", "DMV"],
        canada: [],
        latam: [],
    },
];

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");

    const conn = await createConnection({ uri: url });
    console.log("[seed] connected");

    // Upsert partners with their per-partner standard checks.
    for (const p of PARTNERS) {
        await conn.execute(
            `INSERT INTO partners (id, name, code, standard_checks, is_active)
             VALUES (?, ?, ?, CAST(? AS JSON), 1)
             ON DUPLICATE KEY UPDATE
               name = VALUES(name),
               standard_checks = VALUES(standard_checks)`,
            [cuid(), p.name, p.code, JSON.stringify(p.standardChecks)]
        );
    }
    console.log(`[seed] partners upserted: ${PARTNERS.length}`);

    // Upsert client matrices.
    for (const c of CLIENT_SEED) {
        const [rows] = await conn.execute<(RowDataPacket & { id: string })[]>(
            "SELECT id FROM partners WHERE code = ?",
            [c.partnerCode]
        );
        if (!rows.length) continue;
        const partnerId = rows[0].id;

        await conn.execute(
            `INSERT INTO partner_clients
               (id, partner_id, client_name, usa_checks, canada_checks, latam_checks, special_notes)
             VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), ?)
             ON DUPLICATE KEY UPDATE
               usa_checks = VALUES(usa_checks),
               canada_checks = VALUES(canada_checks),
               latam_checks = VALUES(latam_checks),
               special_notes = VALUES(special_notes)`,
            [
                cuid(),
                partnerId,
                c.clientName,
                JSON.stringify(c.usa),
                JSON.stringify(c.canada),
                JSON.stringify(c.latam),
                c.specialNotes ?? null,
            ]
        );
    }
    console.log(`[seed] partner_clients upserted: ${CLIENT_SEED.length}`);

    await conn.end();
    console.log("[seed] done ✓");
}

main().catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
});
