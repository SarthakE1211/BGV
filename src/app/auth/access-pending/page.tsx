// src/app/auth/access-pending/page.tsx
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default function AccessPendingPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f1f1f1] px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-10 text-center space-y-6">
                <div className="relative w-40 h-12 mx-auto">
                    <Image
                        src="/assets/svg/Ovationwps.svg"
                        alt="Ovation Workplace Services"
                        fill
                        sizes="160px"
                        className="object-contain"
                        priority
                    />
                </div>

                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mx-auto">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="1.5"
                        width="32"
                        height="32"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6l3.75 2.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900">Access Pending</h1>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Your Microsoft account was verified, but you haven&apos;t been
                        assigned a role in the BGV Portal yet. Please contact your HR
                        Head to get access.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <Link
                        href="/auth/signin"
                        className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
                    >
                        Back to Sign In
                    </Link>
                    <p className="text-xs text-slate-400">
                        Once your HR Head adds you, sign in again with the same Microsoft
                        account.
                    </p>
                </div>
            </div>
        </div>
    );
}
