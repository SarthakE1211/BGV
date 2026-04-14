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
