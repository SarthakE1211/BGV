// src/lib/partners.ts
//
// Partner-related data access used by the New Request form (which needs
// the partner *id*, not the code) and by the Partners admin page later.

import { query } from "@/src/lib/db";

export interface PartnerOption {
    id: string;
    code: string;
    name: string;
}

export async function getPartnerOptionsWithIds(): Promise<PartnerOption[]> {
    return query<PartnerOption>(
        `SELECT id, code, name
         FROM partners
         WHERE is_active = 1
         ORDER BY name ASC`
    );
}
