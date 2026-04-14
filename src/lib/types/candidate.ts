export interface CandidateRow {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    date_of_birth: Date | null;
    is_blacklisted: 0 | 1;
    created_at: Date;
}
