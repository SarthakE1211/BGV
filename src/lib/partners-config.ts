// src/lib/partners-config.ts
//
// Read-only view of partners + their clients + check matrices.
// Powers the Partners & Checks admin page.
// Calls Django REST API instead of direct MySQL queries.

import { api } from "@/src/lib/api-client";

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

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getPartnersConfig(userId?: string): Promise<PartnerConfigRow[]> {
    const data = await api<any>("/partners/config/", {
        userId,
        params: { page_size: 100 },
    });

    // Handle both paginated { results: [...] } and flat array responses
    const rows: any[] = Array.isArray(data) ? data : (data.results ?? []);

    return rows.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        standardChecks: parseJsonArray(
            p.standard_checks ?? p.standardChecks ?? []
        ),
        isActive: Boolean(p.is_active ?? p.isActive ?? true),
        clients: (p.clients ?? []).map((c: any) => ({
            id: c.id,
            clientName: c.client_name ?? c.clientName ?? "",
            usaChecks: parseJsonArray(c.usa_checks ?? c.usaChecks ?? []),
            canadaChecks: parseJsonArray(
                c.canada_checks ?? c.canadaChecks ?? []
            ),
            latamChecks: parseJsonArray(
                c.latam_checks ?? c.latamChecks ?? []
            ),
            specialNotes: c.special_notes ?? c.specialNotes ?? null,
        })),
    }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */
