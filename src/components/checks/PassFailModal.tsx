// src/components/checks/PassFailModal.tsx
"use client";

// Single modal that handles both Pass and Fail flows.
// `mode === "pass"` → remarks optional. `mode === "fail"` → remarks required.

import { useEffect, useState, useTransition } from "react";
import Modal from "@/src/components/ui/Modal";
import { clearCheck, failCheck } from "@/src/actions/checks";

interface Props {
    open: boolean;
    mode: "pass" | "fail" | null;
    checkId: string | null;
    checkType: string | null;
    onClose: () => void;
    onDone?: () => void;
}

export default function PassFailModal({
    open,
    mode,
    checkId,
    checkType,
    onClose,
    onDone,
}: Props) {
    const [remarks, setRemarks] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, startSubmit] = useTransition();

    useEffect(() => {
        if (open) {
            setRemarks("");
            setError(null);
        }
    }, [open]);

    if (!open || !mode || !checkId) return null;

    const isPass = mode === "pass";

    const handleSubmit = () => {
        setError(null);
        if (!isPass && remarks.trim().length < 3) {
            setError("Failure remarks are required (min 3 chars).");
            return;
        }
        startSubmit(async () => {
            const res = isPass
                ? await clearCheck({ checkId, remarks })
                : await failCheck({ checkId, remarks });
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
            title={isPass ? "Mark Check as Cleared" : "Mark Check as Failed"}
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
                        className={`btn ${isPass ? "btn-success" : "btn-danger"}`}
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting
                            ? "Saving..."
                            : isPass
                              ? "Confirm Pass"
                              : "Confirm Fail"}
                    </button>
                </>
            }
        >
            <div className={`info-box ${isPass ? "info-green" : "info-red"}`} style={{ marginTop: 0 }}>
                <strong>{checkType}</strong>
                <div style={{ marginTop: 4 }}>
                    {isPass
                        ? "Mark this check as cleared. Remarks are optional."
                        : "This will mark the check as FAILED. Remarks describing the failure are required."}
                </div>
            </div>

            <div className="form-group" style={{ marginTop: 14 }}>
                <label>Remarks {isPass ? "(optional)" : "*"}</label>
                <textarea
                    rows={3}
                    placeholder={
                        isPass
                            ? "e.g. No records found in 7-year search."
                            : "Describe the failure (mandatory)..."
                    }
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
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
