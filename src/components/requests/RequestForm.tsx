// src/components/requests/RequestForm.tsx
"use client";

// New BGV Request form — three live API calls fire as the user fills it:
//   1. partner change → GET /api/partners/[id]/clients
//   2. region change  → pure JS, updates vendor display + Canada warning
//   3. partner+client+region change → POST /api/checks-matrix
//
// Submit hits the createBGVRequest server action, which runs the 5-step flow
// (blacklist gate → candidate upsert → request insert → checks insert → log).

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import {
    createBGVRequest,
    type CreateBGVRequestInput,
    type CreateBGVRequestResult,
} from "@/src/actions/requests";
import type { PartnerOption } from "@/src/lib/partners";
import type { Region, RoleType, Priority } from "@/src/lib/enums";

// Map the form's region enum to the library's ISO-2 country code. Used as
// the initial country in the phone picker — the user can change it from the
// flag dropdown afterwards.
const REGION_DEFAULT_COUNTRY: Record<Region, string> = {
    USA: "us",
    CANADA: "ca",
    LATAM: "mx",
};

interface ResolvedCheckUI {
    checkType: string;
    source: string;
}

interface ClientOpt {
    id: string;
    clientName: string;
}

interface FormState {
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    candidateDob: string;
    partnerId: string;
    partnerClientId: string;
    roleType: RoleType;
    region: Region;
    priority: Priority;
    notes: string;
}

const EMPTY: FormState = {
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    candidateDob: "",
    partnerId: "",
    partnerClientId: "",
    roleType: "FTE_W2",
    region: "USA",
    priority: "NORMAL",
    notes: "",
};

export default function RequestForm({ partners }: { partners: PartnerOption[] }) {
    const router = useRouter();
    const [form, setForm] = useState<FormState>(EMPTY);
    const [clients, setClients] = useState<ClientOpt[]>([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [checks, setChecks] = useState<ResolvedCheckUI[]>([]);
    const [checksLoading, setChecksLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [blacklistMatch, setBlacklistMatch] =
        useState<Extract<CreateBGVRequestResult, { error: "BLACKLISTED" }>["match"] | null>(
            null
        );
    const [submitting, startSubmit] = useTransition();

    // Pick the initial flag based on whatever region the form boots with,
    // then leave it to the user. Deliberately not reactive — changing region
    // mid-form shouldn't wipe a phone the user has already typed.
    const initialPhoneCountry = useMemo(
        () => REGION_DEFAULT_COUNTRY[form.region] ?? "us",
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    // ── 1. Partner change → fetch clients ─────────────────────────────────
    useEffect(() => {
        if (!form.partnerId) {
            setClients([]);
            set("partnerClientId", "");
            return;
        }
        const ctrl = new AbortController();
        setClientsLoading(true);
        fetch(`/api/partners/${encodeURIComponent(form.partnerId)}/clients`, {
            signal: ctrl.signal,
        })
            .then((r) => r.json())
            .then((d) => {
                setClients(d.clients ?? []);
                // If the previously selected client doesn't belong to the new partner, clear it.
                if (form.partnerClientId && !d.clients?.some((c: ClientOpt) => c.id === form.partnerClientId)) {
                    set("partnerClientId", "");
                }
            })
            .catch((e) => {
                if (e.name !== "AbortError") console.error(e);
            })
            .finally(() => setClientsLoading(false));
        return () => ctrl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.partnerId]);

    // ── 3. Partner + client + region change → resolve check matrix ────────
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
                    partnerClientId: form.partnerClientId || null,
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
    }, [form.partnerId, form.partnerClientId, form.region]);

    useEffect(() => {
        resolveMatrix();
    }, [resolveMatrix]);

    // ── Submit ────────────────────────────────────────────────────────────
    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        setBlacklistMatch(null);

        const payload: CreateBGVRequestInput = {
            candidateName: form.candidateName.trim(),
            candidateEmail: form.candidateEmail.trim(),
            candidatePhone: form.candidatePhone.trim(),
            candidateDob: form.candidateDob,
            partnerId: form.partnerId,
            partnerClientId: form.partnerClientId,
            roleType: form.roleType,
            region: form.region,
            priority: form.priority,
            notes: form.notes,
        };

        startSubmit(async () => {
            const res = await createBGVRequest(payload);
            if (res.ok) {
                router.push(`/requests/${res.requestId}`);
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
        <form onSubmit={onSubmit} className="table-card" style={{ padding: 22 }}>
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

            {/* Partner + Client */}
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
                        value={form.partnerClientId}
                        onChange={(e) => set("partnerClientId", e.target.value)}
                        disabled={!form.partnerId || clientsLoading}
                    >
                        <option value="">
                            {!form.partnerId
                                ? "Select partner first..."
                                : clientsLoading
                                  ? "Loading clients..."
                                  : clients.length === 0
                                    ? "No clients configured"
                                    : "— Direct (no client) —"}
                        </option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.clientName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

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
                <label>Auto-Loaded Checks (based on partner + client + region)</label>
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
                    onClick={() => router.back()}
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
