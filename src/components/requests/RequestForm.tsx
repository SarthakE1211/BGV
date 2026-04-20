// src/components/requests/RequestForm.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import {
    createBGVRequest,
    type CreateBGVRequestInput,
    type CreateBGVRequestResult,
} from "@/src/actions/requests";
import type { PartnerOption } from "@/src/lib/requests";
import type { Region, RoleType, Priority } from "@/src/lib/enums";

const REGION_DEFAULT_COUNTRY: Record<Region, string> = {
    USA: "us",
    CANADA: "ca",
    LATAM: "mx",
};

// Client account options per partner code. "Other..." triggers a free-text input.
const CLIENT_OPTIONS: Record<string, string[]> = {
    HCL: ["Standard (MSA Default)", "Akzonobel", "Arizona Public Service", "Ascension", "Barclays", "BD", "BMS", "GSK", "Merck", "NVIDIA", "Pfizer", "Tenet Healthcare", "USRS", "Other..."],
    COG: ["Standard", "Fortrea", "ServiceNow", "JLL", "McCormick", "HAYS", "CNO", "J&J", "T&R", "Merchant Fleet", "Other..."],
    LTM: ["Standard", "Eversource", "Bird Electric", "Other..."],
    TCS: ["Standard", "Hertz", "Other..."],
    WIP: ["Standard", "Other..."],
    HEX: ["Standard", "Other..."],
    BIR: ["Standard", "Other..."],
    MIN: ["Standard", "Other..."],
};

interface ResolvedCheckUI {
    checkType: string;
    source: string;
}

interface FormState {
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    candidateDob: string;
    partnerId: string;
    clientAccount: string;
    roleType: RoleType;
    region: Region;
    priority: Priority;
    notes: string;
    assignedSpecialistId: string;
}

const EMPTY: FormState = {
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    candidateDob: "",
    partnerId: "",
    clientAccount: "",
    roleType: "FTE_W2",
    region: "USA",
    priority: "NORMAL",
    notes: "",
    assignedSpecialistId: "",
};

export default function RequestForm({ partners, onClose, inModal }: { partners: PartnerOption[]; onClose?: () => void; inModal?: boolean }) {
    const router = useRouter();
    const [form, setForm] = useState<FormState>(EMPTY);
    const [clientOther, setClientOther] = useState("");
    const [checks, setChecks] = useState<ResolvedCheckUI[]>([]);
    const [checksLoading, setChecksLoading] = useState(false);
    const [specialists, setSpecialists] = useState<Array<{ id: string; name: string }>>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [blacklistMatch, setBlacklistMatch] =
        useState<Extract<CreateBGVRequestResult, { error: "BLACKLISTED" }>["match"] | null>(null);
    const [submitting, startSubmit] = useTransition();

    useEffect(() => {
        fetch("/api/specialists")
            .then((r) => r.json())
            .then((d) => setSpecialists(d.specialists ?? []))
            .catch(console.error);
    }, []);

    const initialPhoneCountry = useMemo(
        () => REGION_DEFAULT_COUNTRY[form.region] ?? "us",
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    // Derive current partner code from selected partnerId
    const partnerCode = useMemo(
        () => partners.find((p) => p.id === form.partnerId)?.code ?? "",
        [partners, form.partnerId]
    );

    const clientOptions = CLIENT_OPTIONS[partnerCode] ?? [];
    const isOther = form.clientAccount === "Other...";

    // Clear client selection when partner changes
    useEffect(() => {
        set("clientAccount", "");
        setClientOther("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.partnerId]);

    // Checks matrix — re-runs on partner + region change
    const matrixCtrl = useRef<AbortController | null>(null);
    const resolveMatrix = useCallback(async () => {
        if (!form.partnerId) {
            setChecks([]);
            return;
        }
        matrixCtrl.current?.abort();
        const ctrl = new AbortController();
        matrixCtrl.current = ctrl;
        setChecksLoading(true);
        try {
            const res = await fetch("/api/checks-matrix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partnerId: form.partnerId,
                    partnerClientId: null,
                    region: form.region,
                }),
                signal: ctrl.signal,
            });
            const data = await res.json();
            if (!ctrl.signal.aborted) setChecks(data.checks ?? []);
        } catch (e: unknown) {
            if (e instanceof Error && e.name !== "AbortError") console.error(e);
        } finally {
            if (!ctrl.signal.aborted) setChecksLoading(false);
        }
    }, [form.partnerId, form.region]);

    useEffect(() => {
        resolveMatrix();
    }, [resolveMatrix]);

    // ── Submit ────────────────────────────────────────────────────────────
    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        setBlacklistMatch(null);

        const finalClient = isOther ? clientOther.trim() : form.clientAccount.trim();

        const payload: CreateBGVRequestInput = {
            candidateName: form.candidateName.trim(),
            candidateEmail: form.candidateEmail.trim(),
            candidatePhone: form.candidatePhone.trim(),
            candidateDob: form.candidateDob,
            partnerId: form.partnerId,
            clientAccount: finalClient,
            roleType: form.roleType,
            region: form.region,
            priority: form.priority,
            notes: form.notes,
            assignedSpecialistId: form.assignedSpecialistId || undefined,
        };

        startSubmit(async () => {
            const res = await createBGVRequest(payload);
            if (res.ok) {
                if (inModal) {
                    // Wipe form state so the next open starts fresh.
                    setForm(EMPTY);
                    setClientOther("");
                    setChecks([]);
                    setSubmitError(null);
                    setBlacklistMatch(null);
                    onClose?.();
                    router.refresh();
                } else {
                    router.push(`/requests/${res.requestId}`);
                }
                return;
            }
            if (res.error === "BLACKLISTED" && "match" in res) {
                setBlacklistMatch(res.match);
                return;
            }
            setSubmitError(res.error);
        });
    };

    const isCanada = form.region === "CANADA";
    const canSubmit =
        form.candidateName.trim() &&
        form.candidateEmail.trim() &&
        form.partnerId &&
        form.roleType &&
        !submitting;

    return (
        <form onSubmit={onSubmit} className={inModal ? "" : "table-card"} style={{ padding: 22 }}>
            <div className="info-box info-blue" style={{ marginBottom: 14 }}>
                <strong>SDM Submission Form:</strong> Select the partner and client account
                — the system will auto-load the required checks based on your SOW/MSA configuration.
            </div>

            {/* Candidate name + email */}
            <div className="form-row">
                <div className="form-group">
                    <label>Technician Full Name *</label>
                    <input
                        type="text"
                        placeholder="Enter full name"
                        value={form.candidateName}
                        onChange={(e) => set("candidateName", e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Email Address *</label>
                    <input
                        type="email"
                        placeholder="tech@email.com"
                        value={form.candidateEmail}
                        onChange={(e) => set("candidateEmail", e.target.value)}
                        required
                    />
                </div>
            </div>

            {/* Phone, DOB, Region */}
            <div className="form-row-3">
                <div className="form-group">
                    <label>Phone Number</label>
                    <PhoneInput
                        defaultCountry={initialPhoneCountry}
                        value={form.candidatePhone}
                        onChange={(phone) => set("candidatePhone", phone)}
                        inputProps={{ name: "candidatePhone" }}
                    />
                </div>
                <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                        type="date"
                        value={form.candidateDob}
                        onChange={(e) => set("candidateDob", e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Region *</label>
                    <select
                        value={form.region}
                        onChange={(e) => set("region", e.target.value as Region)}
                    >
                        <option value="USA">USA</option>
                        <option value="CANADA">Canada</option>
                        <option value="LATAM">LATAM</option>
                    </select>
                </div>
            </div>

            {/* Partner + Client Account */}
            <div className="form-row">
                <div className="form-group">
                    <label>ITO Partner *</label>
                    <select
                        value={form.partnerId}
                        onChange={(e) => set("partnerId", e.target.value)}
                        required
                    >
                        <option value="">Select partner...</option>
                        {partners.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Client Account / End Client</label>
                    <select
                        value={form.clientAccount}
                        onChange={(e) => {
                            set("clientAccount", e.target.value);
                            if (e.target.value !== "Other...") setClientOther("");
                        }}
                        disabled={!form.partnerId}
                    >
                        <option value="">
                            {!form.partnerId ? "Select partner first..." : "— Select client —"}
                        </option>
                        {clientOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Free-text input shown only when "Other..." is selected */}
            {isOther && (
                <div className="form-row">
                    <div className="form-group">
                        <label>Specify Client Name</label>
                        <input
                            type="text"
                            placeholder="Enter client / end-client name..."
                            value={clientOther}
                            onChange={(e) => setClientOther(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
            )}

            {/* Role, Priority */}
            <div className="form-row">
                <div className="form-group">
                    <label>Role Type *</label>
                    <select
                        value={form.roleType}
                        onChange={(e) => set("roleType", e.target.value as RoleType)}
                        required
                    >
                        <option value="FTE_W2">FTE W2</option>
                        <option value="PRO">PRO (Project)</option>
                        <option value="DISPATCH">Dispatch</option>
                        <option value="BACKFILL">Backfill</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Priority</label>
                    <select
                        value={form.priority}
                        onChange={(e) => set("priority", e.target.value as Priority)}
                    >
                        <option value="NORMAL">Normal</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High — Urgent Start</option>
                    </select>
                </div>
            </div>

            {/* Specialist assignment */}
            <div className="form-row">
                <div className="form-group">
                    <label>Assign to BGV Specialist</label>
                    <select
                        value={form.assignedSpecialistId}
                        onChange={(e) => set("assignedSpecialistId", e.target.value)}
                    >
                        <option value="">— Unassigned (HR Head will assign) —</option>
                        {specialists.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Vendor display / Canada consent warning */}
            {!isCanada && (
                <div className="info-box info-green" style={{ marginBottom: 10 }}>
                    <strong>BGV Vendor:</strong> DISA (A la Carte) — Standard for{" "}
                    {form.region === "USA" ? "USA" : "LATAM"} candidates.
                </div>
            )}
            {isCanada && (
                <div className="info-box info-amber" style={{ marginBottom: 10 }}>
                    <strong>Canada Requirement:</strong> PreciseHire will be used. A signed
                    consent form (via Adobe) must be collected from the candidate before
                    proceeding.
                </div>
            )}

            {/* Auto-loaded checks preview */}
            <div className="form-group">
                <label>Auto-Loaded Checks (based on partner + region)</label>
                <div
                    style={{
                        padding: 10,
                        background: "var(--bg)",
                        borderRadius: 6,
                        fontSize: 11,
                        color: "var(--text-light)",
                        minHeight: 38,
                    }}
                >
                    {!form.partnerId && "Select a partner to see required checks..."}
                    {form.partnerId && checksLoading && "Resolving checks..."}
                    {form.partnerId && !checksLoading && checks.length === 0 &&
                        "No checks configured for this combination."}
                    {!checksLoading && checks.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {checks.map((c) => (
                                <span
                                    key={c.checkType}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        padding: "3px 8px",
                                        background: "#fff",
                                        border: "1px solid var(--border)",
                                        borderRadius: 4,
                                        fontSize: 10.5,
                                        color: "var(--text)",
                                    }}
                                >
                                    <strong>{c.checkType}</strong>
                                    <span style={{ color: "var(--text-light)" }}>
                                        ({c.source})
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Notes */}
            <div className="form-group">
                <label>Additional Notes / Special Instructions</label>
                <textarea
                    rows={2}
                    placeholder="Any additional details for the BGV specialist..."
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                />
            </div>

            <div className="info-box info-red">
                <strong>Auto-Blacklist Check:</strong> This candidate will be
                cross-referenced against the blacklist registry before the request is
                accepted.
            </div>

            {/* Submit error / blacklist match banners */}
            {blacklistMatch && (
                <div className="info-box info-red" style={{ marginTop: 12 }}>
                    <strong>Blacklist match found.</strong> Cannot create request.
                    <div style={{ marginTop: 6, lineHeight: 1.55 }}>
                        Matched candidate: <strong>{blacklistMatch.candidateName}</strong> ·{" "}
                        {blacklistMatch.candidateEmail} <br />
                        Reason: {blacklistMatch.reason} <br />
                        Match type: {blacklistMatch.matchType === "EMAIL" ? "Email exact" : "Name match"}
                    </div>
                </div>
            )}
            {submitError && !blacklistMatch && (
                <div className="info-box info-red" style={{ marginTop: 12 }}>
                    {submitError}
                </div>
            )}

            {/* Footer actions */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: "1px solid var(--border)",
                }}
            >
                <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => onClose ? onClose() : router.back()}
                    disabled={submitting}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!canSubmit}
                >
                    {submitting ? "Submitting..." : "Submit BGV Request"}
                </button>
            </div>
        </form>
    );
}
