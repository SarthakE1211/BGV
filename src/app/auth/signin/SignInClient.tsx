// src/app/auth/signin/SignInClient.tsx
"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
    const error = searchParams.get("error");

    // Error codes fall into three buckets:
    //   1. App-level rejections (AccountDisabled, MissingEmail) — from our signIn callback
    //   2. Azure tenant rejections (OAuthCallback, OAuthSignin, AccessDenied) — Microsoft
    //      refused before reaching our callback. Most common cause: user isn't a member
    //      or guest of the OvationWPS tenant (AADSTS90072).
    //   3. Everything else (Configuration, Default) — generic fallback
    const errorMessages: Record<string, { title: string; body: string; hint?: string }> = {
        AccessDenied: {
            title: "Access denied",
            body: "Your Microsoft account was rejected by the OvationWPS organization.",
            hint: "This usually means your account isn't a member or guest of the OvationWPS tenant. Contact your HR Head to be invited.",
        },
        OAuthCallback: {
            title: "Microsoft sign-in failed",
            body: "Microsoft couldn't complete the sign-in.",
            hint: "If you saw an error like “AADSTS90072” on the Microsoft page, your account isn't part of the OvationWPS organization yet. Ask your HR Head to invite you as a guest user.",
        },
        OAuthSignin: {
            title: "Microsoft sign-in failed",
            body: "We couldn't start the Microsoft sign-in flow.",
            hint: "Try again. If the problem persists, contact IT.",
        },
        Callback: {
            title: "Sign-in callback failed",
            body: "Something went wrong while finishing the sign-in.",
            hint: "Close this tab and try again. If the error repeats, contact IT.",
        },
        AccountDisabled: {
            title: "Account deactivated",
            body: "Your account has been deactivated. Contact your HR Head to regain access.",
        },
        SsoDisabled: {
            title: "Sign-in temporarily disabled",
            body: "The HR Head has temporarily disabled Microsoft 365 sign-in for non-admin users.",
            hint: "Please try again later, or contact your HR Head if this is urgent.",
        },
        MissingEmail: {
            title: "Missing email",
            body: "We couldn't read an email address from your Microsoft account.",
            hint: "Contact IT — your Microsoft profile may be missing an email attribute.",
        },
        Configuration: {
            title: "Server configuration error",
            body: "A server configuration error occurred.",
            hint: "Contact IT with the current timestamp.",
        },
        Default: {
            title: "Authentication error",
            body: "An authentication error occurred. Please try again.",
        },
    };

    const currentError = error ? errorMessages[error] ?? errorMessages.Default : null;

    const handleMicrosoftLogin = async () => {
        try {
            await signIn("azure-ad", { callbackUrl });
        } catch (err) {
            console.error("Error during Microsoft login:", err);
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans">

            {/* ── Top Navbar ─────────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6 bg-gradient-to-r from-white-800 via-red-400 to-red-900 shadow-lg">

                {/* Left: Logo + Portal Label */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Navbar logo — fixed size so Next/Image renders correctly */}
                    <div className="relative w-36 h-36 flex-shrink-0">
                        <Image
                            src="/assets/svg/Ovationwps.svg"
                            alt="Ovation Workplace Services logo"
                            fill
                            sizes="144px"
                            className="object-contain"
                            priority
                        />
                    </div>

                    {/* Brand text */}
                    {/* <div className="flex flex-col leading-tight">
                        <span className="text-white text-xs font-bold tracking-widest uppercase">
                            Ovation
                        </span>
                        <span className="text-white/70 text-[9px] tracking-widest uppercase hidden sm:block">
                            Workplace Services
                        </span>
                    </div> */}

                    {/* Divider + Portal label */}
                    <span className="hidden sm:block text-white/30 text-lg font-thin ml-1">|</span>
                    <span className="hidden sm:block text-white/90 text-xs font-semibold tracking-wide ml-1">
                        BGV Portal
                    </span>
                </div>

                {/* Right: Status + Sign In button */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Not signed in indicator */}
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                        <span className="text-white/80 text-xs font-medium hidden sm:block">
                            Not signed in
                        </span>
                    </div>

                    {/* Sign In button */}
                    <button
                        onClick={handleMicrosoftLogin}
                        type="button"
                        className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-150 cursor-pointer"
                    >
                        {/* Lock icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"
                            width="12" height="12" className="flex-shrink-0">
                            <path fillRule="evenodd"
                                d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Sign In
                    </button>
                </div>
            </nav>

            {/* ── Main Content ───────────────────────────────────────────── */}
            <main className="flex-1 flex items-center justify-center pt-14 px-4 sm:px-8 pb-8 bg-[#f1f1f1]">

                <div className="w-full max-w-md flex flex-col items-center gap-6 py-8">

                    {/* ── Ovation Logo ──
                        Use a fixed-size wrapper div with position:relative.
                        Next.js Image with fill= requires a positioned parent with explicit dimensions.
                        Do NOT use width/height="auto" — it breaks SSR rendering.
                    */}
                    <div className="relative w-52 h-16 sm:w-64 sm:h-20">
                        <Image
                            src="/assets/svg/Ovationwps.svg"
                            alt="Ovation Workplace Services"
                            fill
                            sizes="(max-width: 640px) 208px, 256px"
                            className="object-contain object-center"
                            priority
                        />
                    </div>

                    {/* Page Title */}
                    <h1 className="text-xl sm:text-2xl md:text-[26px] font-bold text-gray-900 text-center leading-snug tracking-tight px-2">
                        Sign in to Ovation WPS BGV Portal
                    </h1>

                    {/* Subtitle */}
                    <p className="text-sm text-gray-500 text-center -mt-2">
                        Background Verification Management System
                    </p>

                    {/* Error Banner */}
                    {currentError && (
                        <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-left">
                            <div className="flex items-start gap-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-red-800">
                                        {currentError.title}
                                    </div>
                                    <div className="text-sm text-red-700 mt-0.5">
                                        {currentError.body}
                                    </div>
                                    {currentError.hint && (
                                        <div className="text-xs text-red-600 mt-2 leading-relaxed">
                                            {currentError.hint}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Microsoft Sign-In Button */}
                    <button
                        onClick={handleMicrosoftLogin}
                        type="button"
                        className="w-full max-w-[320px] sm:max-w-sm flex items-center justify-center gap-3 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white text-sm sm:text-base font-bold py-3 sm:py-3.5 px-6 rounded-xl shadow-[0_4px_16px_rgba(185,28,28,0.4)] hover:shadow-[0_6px_20px_rgba(185,28,28,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer"
                    >
                        <MicrosoftLogo />
                        Sign in with Microsoft
                    </button>

                    {/* Switch to CRM Portal */}
                    <button
                        type="button"
                        className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-4 decoration-gray-400 transition-colors duration-150 bg-transparent border-none cursor-pointer -mt-2"
                    >
                        Switch to CRM Portal →
                    </button>

                    {/* Footer note */}
                    <p className="text-xs text-gray-400 text-center -mt-2">
                        Use your company Microsoft 365 account
                    </p>

                    {/* ── Trouble signing in? — always visible help section ─────── */}
                    <details className="w-full mt-2 text-left">
                        <summary className="text-sm text-gray-600 hover:text-gray-800 cursor-pointer select-none font-medium">
                            Trouble signing in?
                        </summary>
                        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 space-y-2 leading-relaxed">
                            <p>
                                <strong>Who can sign in:</strong> Only users whose email has
                                been pre-registered by the HR Head, AND whose Microsoft
                                account is a member or guest of the OvationWPS tenant.
                            </p>
                            <p>
                                <strong>Seeing “AADSTS90072” on the Microsoft page?</strong>{" "}
                                Your Microsoft account isn't part of the OvationWPS
                                organization. Contact your HR Head — they'll invite you as a
                                guest and you'll receive an email from Microsoft to accept.
                            </p>
                            <p>
                                <strong>Seeing “Access Pending”?</strong> Your email isn't in
                                our system yet. Ask your HR Head to provision your account.
                            </p>
                            <p className="pt-1 border-t border-gray-200 mt-2">
                                Still stuck? Contact IT with the error code and the time of
                                the failed sign-in attempt.
                            </p>
                        </div>
                    </details>
                </div>
            </main>
        </div>
    );
}

export default function SignInClient() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f1f1f1]" />
        }>
            <SignInContent />
        </Suspense>
    );
}

// ─── Microsoft Logo Icon ──────────────────────────────────────────────────────

function MicrosoftLogo() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 21 21"
            width="20"
            height="20"
            className="flex-shrink-0"
        >
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
    );
}