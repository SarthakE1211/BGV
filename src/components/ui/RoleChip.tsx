// src/components/ui/RoleChip.tsx

import type { RoleType } from "@/src/lib/enums";

const ROLE_CLASS: Record<RoleType, string> = {
    FTE_W2:   "role-fte",
    DISPATCH: "role-dispatch",
    PRO:      "role-pro",
    BACKFILL: "role-backfill",
};

const ROLE_LABEL: Record<RoleType, string> = {
    FTE_W2:   "FTE W2",
    DISPATCH: "Dispatch",
    PRO:      "PRO",
    BACKFILL: "Backfill",
};

export default function RoleChip({ role }: { role: RoleType }) {
    return <span className={`role-chip ${ROLE_CLASS[role]}`}>{ROLE_LABEL[role]}</span>;
}
