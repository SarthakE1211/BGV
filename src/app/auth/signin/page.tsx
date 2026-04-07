// src/app/auth/signin/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";
import SignInClient from "./SignInClient";

/**
 * Server component — runs before anything is sent to the client.
 * If the user already has a valid session, redirect straight to /dashboard.
 * Otherwise render the client sign-in UI.
 */
export default async function SignInPage() {
    const session = await getServerSession(authOptions);

    if (session?.user) {
        redirect("/dashboard");
    }

    return <SignInClient />;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function ShieldIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            width="28"
            height="28"
        >
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