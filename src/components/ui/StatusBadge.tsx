// src/components/ui/StatusBadge.tsx — uses prototype `.status-*` classes.

import type { BGVStatus, CheckStatus } from "@/src/lib/enums";

type AnyStatus = BGVStatus | CheckStatus;

const STATUS_CLASS: Record<AnyStatus, string> = {
    PENDING:     "status-pending",
    IN_PROGRESS: "status-in-progress",
    GREEN:       "status-green",
    AMBER:       "status-amber",
    RED_FLAG:    "status-red",
    BLACKLISTED: "status-blacklisted",
    CLEARED:     "status-green",
    FAILED:      "status-failed",
};

const STATUS_LABEL: Record<AnyStatus, string> = {
    PENDING:     "Pending",
    IN_PROGRESS: "In Progress",
    GREEN:       "Green",
    AMBER:       "Amber",
    RED_FLAG:    "Red Flag",
    BLACKLISTED: "Blacklisted",
    CLEARED:     "Cleared",
    FAILED:      "Failed",
};

export default function StatusBadge({ status }: { status: AnyStatus }) {
    return (
        <span className={`status-badge ${STATUS_CLASS[status]}`}>
            {STATUS_LABEL[status]}
        </span>
    );
}
