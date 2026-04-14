import type { Region } from "@/src/lib/enums";

export interface PartnerRow {
    id: string;
    name: string;
    code: string;
    standard_checks: string[] | null; // JSON → parsed array
    is_active: 0 | 1;
}

export interface PartnerClientRow {
    id: string;
    partner_id: string;
    client_name: string;
    usa_checks: string[] | null;
    canada_checks: string[] | null;
    latam_checks: string[] | null;
    special_notes: string | null;
}

export interface ClientCheckRequirementRow {
    id: string;
    partner_client_id: string;
    check_type: string;
    region: Region;
    is_mandatory: 0 | 1;
    description: string | null;
}
