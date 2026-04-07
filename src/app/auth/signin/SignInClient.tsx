// src/app/auth/signin/SignInClient.tsx
"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
    const error = searchParams.get("error");

    const errorMessages: Record<string, string> = {
        AccessDenied: "Your account does not have access to the BGV Portal.",
        AccountDisabled: "Your account has been deactivated. Contact HR.",
        Configuration: "A server configuration error occurred.",
        Default: "An authentication error occurred. Please try again.",
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-10 space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 mb-2">
                        <ShieldIcon />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        BGV Portal
                    </h1>
                    <p className="text-sm text-slate-500">
                        Background Verification Management System
                    </p>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {errorMessages[error] ?? errorMessages.Default}
                    </div>
                )}

                {/* Sign-in button */}
                <button
                    onClick={() => signIn("azure-ad", { callbackUrl })}
                    className=" cursor-pointer w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:border-blue-400 hover:bg-slate-50 text-slate-800 font-medium py-3 px-4 rounded-xl transition-all duration-150 shadow-sm"
                    type="button"
                >
                    <MicrosoftLogo />
                    Sign in with Microsoft
                </button>

                <p className="text-center text-xs text-slate-400">
                    Use your company Microsoft 365 account
                </p>
            </div>
        </div>
    );
}

export default function SignInClient() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
            <SignInContent />
        </Suspense>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ShieldIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="28" height="28">
            <path
                fillRule="evenodd"
                d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                clipRule="evenodd"
            />
        </svg>
    );
}

function MicrosoftLogo() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="20" height="20">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
    );
}