// src/lib/types.ts
//
// Row shapes that match the SELECT output from each table. Column names are
// the snake_case DB names — call `mapUser(row)` etc. from `lib/mappers.ts`
// if you want a camelCase domain object.

import type {
    UserRole,
    BGVStatus,
    CheckStatus,
    RoleType,
    Region,
    BGVVendor,
    Priority,
} from "./enums";

export interface UserRow {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    image: string | null;
    azure_ad_id: string | null;
    is_active: 0 | 1;
    created_at: Date;
}

export interface CandidateRow {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    date_of_birth: Date | null;
    is_blacklisted: 0 | 1;
    created_at: Date;
}

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

export interface BGVRequestRow {
    id: string;
    request_number: string;
    candidate_id: string;
    partner_id: string;
    partner_client_id: string | null;
    submitted_by_id: string;
    approved_by_id: string | null;
    role_type: RoleType;
    region: Region;
    bgv_vendor: BGVVendor;
    status: BGVStatus;
    priority: Priority;
    bgv_type: string;
    deployment_date: Date | null;
    initiation_date: Date | null;
    completion_date: Date | null;
    letter_issued_date: Date | null;
    disa_cost: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface BGVCheckRow {
    id: string;
    bgv_request_id: string;
    assigned_to_id: string | null;
    check_type: string;
    requirement_source: string | null;
    status: CheckStatus;
    started_at: Date | null;
    completed_at: Date | null;
    remarks: string | null;
    created_at: Date;
}

export interface BlacklistEntryRow {
    id: string;
    candidate_id: string;
    bgv_request_id: string;
    failed_check: string;
    reason: string;
    blacklisted_by_id: string;
    created_at: Date;
}

export interface ActivityLogRow {
    id: string;
    bgv_request_id: string;
    performed_by_id: string;
    action: string;
    details: string | null;
    created_at: Date;
}

export interface EmailLogRow {
    id: string;
    bgv_request_id: string | null;
    trigger_type: string;
    recipient_email: string;
    subject: string;
    status: string;
    sent_at: Date;
}
