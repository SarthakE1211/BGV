// src/lib/partners-config.ts
//
// Read-only view of partners + their clients + check matrices.
// Powers the Partners & Checks admin page.

import { query } from "@/src/lib/db";

export interface PartnerConfigRow {
    id: string;
    code: string;
    name: string;
    standardChecks: string[];
    isActive: boolean;
    clients: Array<{
        id: string;
        clientName: string;
        usaChecks: string[];
        canadaChecks: string[];
        latamChecks: string[];
        specialNotes: string | null;
    }>;
}

function parseJsonArray(v: unknown): string[] {
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
    if (typeof v === "string") {
        try {
            const j = JSON.parse(v);
            return Array.isArray(j) ? j.filter((x) => typeof x === "string") : [];
        } catch {
            return [];
        }
    }
    return [];
}

export async function getPartnersConfig(): Promise<PartnerConfigRow[]> {
    const partners = await query<{
        id: string;
        code: string;
        name: string;
        standard_checks: unknown;
        is_active: 0 | 1;
    }>(
        `SELECT id, code, name, standard_checks, is_active
         FROM partners ORDER BY name ASC`
    );

    const clients = await query<{
        id: string;
        partner_id: string;
        client_name: string;
        usa_checks: unknown;
        canada_checks: unknown;
        latam_checks: unknown;
        special_notes: string | null;
    }>(
        `SELECT id, partner_id, client_name, usa_checks, canada_checks, latam_checks, special_notes
         FROM partner_clients
         ORDER BY client_name ASC`
    );

    const byPartner = new Map<string, PartnerConfigRow["clients"]>();
    for (const c of clients) {
        const list = byPartner.get(c.partner_id) ?? [];
        list.push({
            id: c.id,
            clientName: c.client_name,
            usaChecks: parseJsonArray(c.usa_checks),
            canadaChecks: parseJsonArray(c.canada_checks),
            latamChecks: parseJsonArray(c.latam_checks),
            specialNotes: c.special_notes,
        });
        byPartner.set(c.partner_id, list);
    }

    return partners.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        standardChecks: parseJsonArray(p.standard_checks),
        isActive: Boolean(p.is_active),
        clients: byPartner.get(p.id) ?? [],
    }));
}
