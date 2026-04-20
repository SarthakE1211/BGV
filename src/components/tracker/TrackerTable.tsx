// src/components/tracker/TrackerTable.tsx

import TrackerRowList, { type RequestGroup } from "@/src/components/tracker/TrackerRowList";
import type { TrackerRow } from "@/src/lib/tracker";
import type { UserRole } from "@/src/lib/enums";

function groupByRequest(rows: TrackerRow[]): RequestGroup[] {
    const map = new Map<string, RequestGroup>();
    for (const row of rows) {
        if (!map.has(row.requestId)) {
            map.set(row.requestId, {
                requestId: row.requestId,
                candidateName: row.candidateName,
                candidateEmail: row.candidateEmail,
                partnerCode: row.partnerCode,
                clientName: row.clientName,
                checks: [],
            });
        }
        map.get(row.requestId)!.checks.push(row);
    }
    return Array.from(map.values());
}

interface Props {
    rows: TrackerRow[];
    filtersSlot: React.ReactNode;
    viewerRole: UserRole;
    specialists: Array<{ id: string; name: string }>;
}

export default function TrackerTable({ rows, filtersSlot, viewerRole, specialists }: Props) {
    const canActOnChecks = viewerRole === "SPECIALIST" || viewerRole === "HR_HEAD";
    const canAssignSpecialist = viewerRole === "HR_HEAD";
    const groups = groupByRequest(rows);

    return (
        <div className="table-card">
            <div className="table-header">
                <h3>BGV Check Tracker</h3>
                {filtersSlot}
            </div>
            <div className="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Technician</th>
                            <th>Partner / Account</th>
                            <th>Assigned Specialist</th>
                            <th>Checks Summary</th>
                            <th>Overall Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <TrackerRowList
                            groups={groups}
                            specialists={specialists}
                            canActOnChecks={canActOnChecks}
                            canAssignSpecialist={canAssignSpecialist}
                        />
                    </tbody>
                </table>
            </div>
        </div>
    );
}
