/**
 * Provision a user (or change an existing user's role) by email.
 *
 *   npm run db:make-admin -- alice@company.com            # defaults to HR_HEAD
 *   npm run db:set-role   -- alice@company.com HR_HEAD
 *   npm run db:set-role   -- alice@company.com SPECIALIST
 *   npm run db:set-role   -- alice@company.com SDM
 *
 * Used to bootstrap the first HR Head. Once an HR Head exists they can add
 * further users from Settings → User Management in the UI.
 *
 * If the email does not exist, a new pre-provisioned row is created with
 * is_active=1 and no azure_ad_id — the Azure fields are backfilled on that
 * user's first M365 sign-in.
 */
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { config as loadEnv } from "dotenv";
import { randomBytes } from "node:crypto";

loadEnv({ path: ".env.local" });
loadEnv();

type UserRole = "SDM" | "SPECIALIST" | "HR_HEAD";
const VALID_ROLES: UserRole[] = ["SDM", "SPECIALIST", "HR_HEAD"];

interface UserRow extends RowDataPacket {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    is_active: 0 | 1;
}

function usage(): never {
    console.error(
        "Usage: npm run db:set-role   -- <email> <SDM|SPECIALIST|HR_HEAD>\n" +
            "       npm run db:make-admin -- <email>      # defaults to HR_HEAD"
    );
    process.exit(1);
}

async function main() {
    const args = process.argv.slice(2);
    const email = args[0];
    if (!email) usage();
    // If no role arg provided, default to HR_HEAD (makes `db:make-admin` a one-liner).
    const requestedRole = (args[1] ?? "HR_HEAD") as UserRole;

    if (!VALID_ROLES.includes(requestedRole)) {
        console.error(
            `Invalid role "${requestedRole}". Must be one of: ${VALID_ROLES.join(", ")}`
        );
        process.exit(1);
    }

    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error("DATABASE_URL is not set in .env.local");
        process.exit(1);
    }

    const conn = await createConnection({ uri: url });

    const [rows] = await conn.execute<UserRow[]>(
        "SELECT id, name, email, role, is_active FROM users WHERE email = ? LIMIT 1",
        [email]
    );

    if (rows.length === 0) {
        // Pre-provision: HR Head enters an email before the user has ever
        // signed in. azure_ad_id / image are filled on first Azure AD login.
        const id = "c" + Date.now().toString(36) + randomBytes(8).toString("hex");
        const placeholderName = email.split("@")[0];
        await conn.execute(
            `INSERT INTO users (id, name, email, role, is_active)
             VALUES (?, ?, ?, ?, 1)`,
            [id, placeholderName, email, requestedRole]
        );
        console.log(
            `\nCreated: ${placeholderName} <${email}> — role=${requestedRole}, active=yes ✓\n` +
                `They can now sign in at http://localhost:3000/auth/signin with their\n` +
                `Microsoft 365 account. Name/photo will auto-populate on first login.\n`
        );
        await conn.end();
        return;
    }

    const current = rows[0];
    console.log(
        `\nBefore: ${current.name} <${current.email}> — role=${current.role}, active=${current.is_active ? "yes" : "no"}`
    );

    if (current.role === requestedRole && current.is_active === 1) {
        console.log(`Already ${requestedRole} and active — no change needed.`);
        await conn.end();
        return;
    }

    await conn.execute(
        "UPDATE users SET role = ?, is_active = 1 WHERE id = ?",
        [requestedRole, current.id]
    );

    console.log(
        `After:  ${current.name} <${current.email}> — role=${requestedRole}, active=yes ✓\n`
    );
    console.log(
        "Sign out and sign back in — the JWT re-reads role from the DB on next sign-in.\n"
    );

    await conn.end();
}

main().catch((err) => {
    console.error("[set-role] failed:", err);
    process.exit(1);
});
