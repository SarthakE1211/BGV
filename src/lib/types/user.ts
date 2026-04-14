import type { UserRole } from "@/src/lib/enums";

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
