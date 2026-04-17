// src/lib/db.ts
//
// mysql2 connection pool + thin query helpers. This is the ONLY file that
// talks to the database driver — everything else uses `query` / `queryOne`
// / `execute` / `tx` from here.
//
// Design notes:
// - One pool per Node process, stashed on globalThis to survive Next.js
//   hot-reload in dev.
// - All helpers use parameterized queries (`?` placeholders). Never
//   string-interpolate user input into SQL.
// - This module must only be imported by server code (server components,
//   server actions, API routes, layout.tsx). Never import it — or anything
//   that imports it — from a file with "use client" at the top.

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";

declare global {
    // eslint-disable-next-line no-var
    var __bgv_pool: Pool | undefined;
}

function makePool(): Pool {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    return mysql.createPool({
        uri: url,
        connectionLimit: 10,
        waitForConnections: true,
        dateStrings: false,
        // MySQL server NOW() returns local IST wall-clock and stores the
        // string in DATETIME as-is (no tz info). Tell the driver that DATETIME
        // values are in +05:30 so it constructs JS Date objects pointing to
        // the correct UTC moment — the UI formatter then converts back to
        // IST and the wall-clock round-trip lines up.
        timezone: "+05:30",
        namedPlaceholders: false,
        decimalNumbers: true,
    });
}

export const pool: Pool = global.__bgv_pool ?? makePool();
if (process.env.NODE_ENV !== "production") global.__bgv_pool = pool;

/** SELECT → array of rows. Use with `<RowType>()` to get typed results. */
export async function query<T = RowDataPacket>(
    sql: string,
    params: unknown[] = []
): Promise<T[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    return rows as unknown as T[];
}

/** SELECT → first row or null. */
export async function queryOne<T = RowDataPacket>(
    sql: string,
    params: unknown[] = []
): Promise<T | null> {
    const rows = await query<T>(sql, params);
    return rows[0] ?? null;
}

/** INSERT / UPDATE / DELETE → affectedRows + insertId. */
export async function execute(
    sql: string,
    params: unknown[] = []
): Promise<ResultSetHeader> {
    const [res] = await pool.execute<ResultSetHeader>(sql, params);
    return res;
}

/** Run `fn` inside a transaction. Auto-rollback on throw. */
export async function tx<T>(
    fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const out = await fn(conn);
        await conn.commit();
        return out;
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}
