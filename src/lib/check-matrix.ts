// src/lib/check-matrix.ts
//
// Resolves the FINAL list of BGV checks required for a given
// (partner, client, region) combo. The rule:
//
//   final = union(
//     partners.standard_checks,                          -- always
//     partner_clients.{usa|canada|latam}_checks          -- if client provided
//   )
//
// Each returned check carries a `source` label used by the form to show
// "(HCL Standard)" or "(Merck Custom)" pills next to each chip.

import { queryOne } from "@/src/lib/db";
import type { Region } from "@/src/lib/enums";

export interface ResolvedCheck {
    checkType: string;
    source: string; // e.g. "HCL Standard" or "Merck Custom"
}

interface PartnerRow {
    id: string;
    code: string;
    name: string;
    standard_checks: string[] | string | null;
}

interface ClientRow {
    id: string;
    client_name: string;
    usa_checks: string[] | string | null;
    canada_checks: string[] | string | null;
    latam_checks: string[] | string | null;
}

/** mysql2 returns JSON columns as either parsed arrays or raw strings — normalize. */
function asArray(v: unknown): string[] {
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
    if (typeof v === "string") {
        try {
            const parsed = JSON.parse(v);
            return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
        } catch {
            return [];
        }
    }
    return [];
}

export async function resolveCheckMatrix(
    partnerId: string,
    partnerClientId: string | null,
    region: Region
): Promise<ResolvedCheck[]> {
    const partner = await queryOne<PartnerRow>(
        `SELECT id, code, name, standard_checks FROM partners WHERE id = ? LIMIT 1`,
        [partnerId]
    );
    if (!partner) return [];

    const standard = asArray(partner.standard_checks);
    const merged = new Map<string, string>();
    for (const c of standard) merged.set(c, `${partner.code} Standard`);

    if (partnerClientId) {
        const client = await queryOne<ClientRow>(
            `SELECT id, client_name, usa_checks, canada_checks, latam_checks
             FROM partner_clients WHERE id = ? LIMIT 1`,
            [partnerClientId]
        );
        if (client) {
            const custom = asArray(
                region === "CANADA"
                    ? client.canada_checks
                    : region === "LATAM"
                      ? client.latam_checks
                      : client.usa_checks
            );
            for (const c of custom) {
                // Custom takes precedence over partner standard label.
                merged.set(c, `${client.client_name} Custom`);
            }
        }
    }

    return Array.from(merged.entries()).map(([checkType, source]) => ({
        checkType,
        source,
    }));
}
