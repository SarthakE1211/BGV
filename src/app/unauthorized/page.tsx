// src/app/unauthorized/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";

export default async function UnauthorizedPage() {
    const session = await getServerSession(authOptions);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-10 text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mx-auto">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        width="32"
                        height="32"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
                    <p className="text-sm text-slate-500">
                        You don&apos;t have permission to view this page.
                    </p>
                    {session?.user && (
                        <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 inline-block">
                            Your role:{" "}
                            <span className="font-semibold text-slate-600">
                                {session.user.role}
                            </span>
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <Link
                        href="/dashboard"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors text-sm"
                    >
                        Back to Dashboard
                    </Link>
                    <p className="text-xs text-slate-400">
                        Need access? Contact your HR Head to update your role.
                    </p>
                </div>
            </div>
        </div>
    );
}