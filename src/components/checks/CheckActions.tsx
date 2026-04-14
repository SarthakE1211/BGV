// src/components/checks/CheckActions.tsx
"use client";

// Pass / Fail / Blacklist button cluster for one check row. Owns the
// modal state for the row. Used by both the request-detail check list
// and the tracker table.

import { useState } from "react";
import PassFailModal from "@/src/components/checks/PassFailModal";
import BlacklistModal from "@/src/components/checks/BlacklistModal";
import type { CheckStatus } from "@/src/lib/enums";

interface Props {
    checkId: string;
    checkType: string;
    status: CheckStatus;
    candidateName?: string;
    candidateEmail?: string;
    canBlacklist?: boolean;
}

export default function CheckActions({
    checkId,
    checkType,
    status,
    candidateName,
    candidateEmail,
    canBlacklist,
}: Props) {
    const [pfMode, setPfMode] = useState<"pass" | "fail" | null>(null);
    const [blOpen, setBlOpen] = useState(false);

    const isOpen = status === "PENDING" || status === "IN_PROGRESS";
    const isFailed = status === "FAILED";

    return (
        <>
            <div className="check-actions">
                {isOpen && (
                    <>
                        <button
                            className="btn btn-sm btn-success"
                            onClick={() => setPfMode("pass")}
                        >
                            Pass
                        </button>
                        <button
                            className="btn btn-sm btn-danger"
                            onClick={() => setPfMode("fail")}
                        >
                            Fail
                        </button>
                    </>
                )}
                {isFailed && canBlacklist && (
                    <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setBlOpen(true)}
                    >
                        Blacklist
                    </button>
                )}
            </div>

            <PassFailModal
                open={pfMode !== null}
                mode={pfMode}
                checkId={checkId}
                checkType={checkType}
                onClose={() => setPfMode(null)}
            />
            <BlacklistModal
                open={blOpen}
                checkId={checkId}
                candidateName={candidateName}
                candidateEmail={candidateEmail}
                failedCheck={checkType}
                onClose={() => setBlOpen(false)}
            />
        </>
    );
}
