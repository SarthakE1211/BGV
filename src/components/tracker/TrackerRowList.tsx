"use client";

import { useState } from "react";
import ExpandableRequestRow from "@/src/components/tracker/ExpandableRequestRow";
import type { TrackerRow } from "@/src/lib/tracker";

interface RequestGroup {
    requestId: string;
    candidateName: string;
    candidateEmail: string;
    partnerCode: string;
    clientName: string | null;
    checks: TrackerRow[];
}

interface Props {
    groups: RequestGroup[];
    specialists: Array<{ id: string; name: string }>;
    canActOnChecks: boolean;
    canAssignSpecialist: boolean;
}

export default function TrackerRowList({ groups, specialists, canActOnChecks, canAssignSpecialist }: Props) {
    const [openId, setOpenId] = useState<string | null>(null);

    const toggle = (requestId: string) =>
        setOpenId((prev) => (prev === requestId ? null : requestId));

    if (groups.length === 0) {
        return (
            <tr>
                <td
                    colSpan={6}
                    style={{
                        textAlign: "center",
                        padding: "40px 20px",
                        color: "var(--text-light)",
                    }}
                >
                    No checks match the current filters.
                </td>
            </tr>
        );
    }

    return (
        <>
            {groups.map((g) => (
                <ExpandableRequestRow
                    key={g.requestId}
                    requestId={g.requestId}
                    candidateName={g.candidateName}
                    candidateEmail={g.candidateEmail}
                    partnerCode={g.partnerCode}
                    clientName={g.clientName}
                    checks={g.checks}
                    canActOnChecks={canActOnChecks}
                    canAssignSpecialist={canAssignSpecialist}
                    open={openId === g.requestId}
                    onToggle={() => toggle(g.requestId)}
                    specialists={specialists}
                />
            ))}
        </>
    );
}

export type { RequestGroup };
