// src/components/checks/BlacklistModal.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Modal from "@/src/components/ui/Modal";
import { blacklistCandidate } from "@/src/actions/blacklist";

interface Props {
    open: boolean;
    checkId: string | null;
    candidateName?: string;
    candidateEmail?: string;
    failedCheck?: string;
    defaultReason?: string;
    onClose: () => void;
    onDone?: () => void;
}

export default function BlacklistModal({
    open,
    checkId,
    candidateName,
    candidateEmail,
    failedCheck,
    defaultReason,
    onClose,
    onDone,
}: Props) {
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, startSubmit] = useTransition();

    useEffect(() => {
        if (open) {
            setReason(defaultReason ?? "");
            setError(null);
        }
    }, [open, defaultReason]);

    if (!open || !checkId) return null;

    const handleConfirm = () => {
        setError(null);
        if (reason.trim().length < 5) {
            setError("Reason is required (min 5 chars).");
            return;
        }
        startSubmit(async () => {
            const res = await blacklistCandidate({ checkId, reason });
            if (res.ok) {
                onDone?.();
                onClose();
            } else {
                setError(res.error);
            }
        });
    };

    return (
        <Modal
            open={open}
            onClose={submitting ? () => {} : onClose}
            title="Confirm Blacklist"
            footer={
                <>
                    <button
                        className="btn btn-outline"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={handleConfirm}
                        disabled={submitting}
                    >
                        {submitting ? "Blacklisting..." : "Confirm Blacklist"}
                    </button>
                </>
            }
        >
            <div className="info-box info-red" style={{ marginTop: 0 }}>
                <strong>{candidateName ?? "Candidate"}</strong>
                <div style={{ marginTop: 4 }}>
                    {candidateEmail && <>Email: {candidateEmail}<br /></>}
                    {failedCheck && <>Failed check: {failedCheck}</>}
                </div>
            </div>

            <div className="info-box info-amber" style={{ marginTop: 8 }}>
                ⚠ This candidate will be permanently flagged. All future BGV requests
                matching this person (by name or email) will be auto-rejected.
            </div>

            <div className="form-group" style={{ marginTop: 14 }}>
                <label>Reason *</label>
                <textarea
                    rows={4}
                    placeholder="Describe why this candidate is being blacklisted..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
            </div>

            {error && (
                <div className="info-box info-red" style={{ marginTop: 4 }}>
                    {error}
                </div>
            )}
        </Modal>
    );
}
