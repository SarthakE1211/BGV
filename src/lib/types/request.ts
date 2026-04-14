import type {
    BGVStatus,
    CheckStatus,
    RoleType,
    Region,
    BGVVendor,
    Priority,
} from "@/src/lib/enums";

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
