/**
 * Raw SQL migration runner — reads db/schema.sql and executes it against
 * the DATABASE_URL target. Replaces `prisma migrate dev` in this project.
 *
 *   npm run db:migrate          # apply schema (idempotent via DROP IF EXISTS)
 *   npm run db:migrate -- --reset   # alias; same behavior
 *
 * Intended for local dev. For production, use a proper migration tool
 * (Flyway, Liquibase, dbmate) or hand-managed numbered .sql files.
 */
import { createConnection } from "mysql2/promise";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");

    const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");

    const conn = await createConnection({ uri: url, multipleStatements: true });
    console.log("[migrate] connected, applying schema.sql …");
    await conn.query(sql);
    await conn.end();
    console.log("[migrate] done ✓");
}

main().catch((err) => {
    console.error("[migrate] failed:", err);
    process.exit(1);
});
