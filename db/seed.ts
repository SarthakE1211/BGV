/**
 * Seeds partners + a handful of partner clients with region-specific check
 * requirements. Safe to re-run — uses INSERT … ON DUPLICATE KEY UPDATE.
 *
 *   npm run db:seed
 */
import { createConnection } from "mysql2/promise";
import { config as loadEnv } from "dotenv";
import { randomBytes } from "node:crypto";

loadEnv({ path: ".env.local" });
loadEnv();

function cuid(): string {
    return "c" + Date.now().toString(36) + randomBytes(8).toString("hex");
}

const PARTNERS = [
    { code: "HCL", name: "HCL Technologies" },
    { code: "COG", name: "Cognizant" },
    { code: "LTM", name: "LTIMindtree" },
    { code: "TCS", name: "Tata Consultancy Services" },
    { code: "WIP", name: "Wipro" },
    { code: "HEX", name: "Hexaware" },
    { code: "BIR", name: "Birlasoft" },
    { code: "MIN", name: "Mindtree" },
];

const STANDARD_CHECKS = [
    "IDENTITY",
    "EDUCATION",
    "EMPLOYMENT",
    "CRIMINAL",
    "DRUG_TEST",
];

const CLIENT_SEED: Array<{
    partnerCode: string;
    clientName: string;
    usa: string[];
    canada: string[];
    latam: string[];
}> = [
    {
        partnerCode: "HCL",
        clientName: "Aetna",
        usa: ["IDENTITY", "EDUCATION", "EMPLOYMENT", "CRIMINAL", "DRUG_TEST", "CREDIT"],
        canada: ["IDENTITY", "EDUCATION", "EMPLOYMENT", "CRIMINAL"],
        latam: ["IDENTITY", "EMPLOYMENT", "CRIMINAL"],
    },
    {
        partnerCode: "COG",
        clientName: "JPMorgan Chase",
        usa: ["IDENTITY", "EDUCATION", "EMPLOYMENT", "CRIMINAL", "DRUG_TEST", "CREDIT", "FINRA"],
        canada: ["IDENTITY", "EDUCATION", "EMPLOYMENT", "CRIMINAL", "CREDIT"],
        latam: [],
    },
    {
        partnerCode: "TCS",
        clientName: "Walmart",
        usa: ["IDENTITY", "EDUCATION", "EMPLOYMENT", "CRIMINAL", "DRUG_TEST"],
        canada: ["IDENTITY", "EDUCATION", "EMPLOYMENT", "CRIMINAL"],
        latam: ["IDENTITY", "EMPLOYMENT"],
    },
];

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");

    const conn = await createConnection({ uri: url });
    console.log("[seed] connected");

    for (const p of PARTNERS) {
        const id = cuid();
        await conn.execute(
            `INSERT INTO partners (id, name, code, standard_checks, is_active)
             VALUES (?, ?, ?, CAST(? AS JSON), 1)
             ON DUPLICATE KEY UPDATE name=VALUES(name), standard_checks=VALUES(standard_checks)`,
            [id, p.name, p.code, JSON.stringify(STANDARD_CHECKS)]
        );
    }
    console.log(`[seed] partners upserted: ${PARTNERS.length}`);

    for (const c of CLIENT_SEED) {
        const [rows] = await conn.execute<any[]>(
            "SELECT id FROM partners WHERE code = ?",
            [c.partnerCode]
        );
        if (!rows.length) continue;
        const partnerId = rows[0].id;

        const clientId = cuid();
        await conn.execute(
            `INSERT INTO partner_clients
               (id, partner_id, client_name, usa_checks, canada_checks, latam_checks)
             VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON))
             ON DUPLICATE KEY UPDATE
               usa_checks = VALUES(usa_checks),
               canada_checks = VALUES(canada_checks),
               latam_checks = VALUES(latam_checks)`,
            [
                clientId,
                partnerId,
                c.clientName,
                JSON.stringify(c.usa),
                JSON.stringify(c.canada),
                JSON.stringify(c.latam),
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
