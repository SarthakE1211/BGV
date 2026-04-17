"use client";

import { useState, useTransition } from "react";
import Modal from "@/src/components/ui/Modal";
import { signOffRequest } from "@/src/actions/requests";

interface Props {
    requestId: string;
    candidateName?: string;
}

export default function ApproveButton({ requestId, candidateName }: Props) {
    const [done, setDone] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    if (done) {
        return (
            <span style={{ color: "var(--success)", fontSize: 12, fontWeight: 600 }}>
                ✓ Approved
            </span>
        );
    }

    const onConfirm = () => {
        setError(null);
        startTransition(async () => {
            try {
                await signOffRequest(requestId);
                setDone(true);
                setConfirmOpen(false);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed");
            }
        });
    };

    return (
        <>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button
                    className="btn btn-sm btn-success"
                    disabled={pending}
                    onClick={() => {
                        setError(null);
                        setConfirmOpen(true);
                    }}
                >
                    Approve
                </button>
                {error && (
                    <span style={{ fontSize: 10, color: "red" }}>{error}</span>
                )}
            </div>

            <Modal
                open={confirmOpen}
                onClose={() => !pending && setConfirmOpen(false)}
                title="Approve BGV Record"
                maxWidth={420}
                footer={
                    <>
                        <button
                            type="button"
                            className="btn btn-outline"
                            disabled={pending}
                            onClick={() => setConfirmOpen(false)}
                        >
                            No
                        </button>
                        <button
                            type="button"
                            className="btn btn-success"
                            disabled={pending}
                            onClick={onConfirm}
                        >
                            {pending ? "Approving…" : "Yes, Approve"}
                        </button>
                    </>
                }
            >
                <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                    Are you sure you want to approve the BGV for{" "}
                    <strong>{candidateName ?? "this candidate"}</strong>?
                </p>
                <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 8 }}>
                    This records your approval with today&apos;s timestamp and notifies the
                    SDM. You can then generate the BGV clearance letter.
                </p>
                {error && (
                    <div className="info-box info-red" style={{ margin: "10px 0 0" }}>
                        {error}
                    </div>
                )}
            </Modal>
        </>
    );
}
