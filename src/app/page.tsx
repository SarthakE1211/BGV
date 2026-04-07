// src/app/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import { redirect } from "next/navigation";

/**
 * Root route ( / )
 * - Authenticated  → /dashboard
 * - Not logged in  → /auth/signin  (middleware also catches this, belt-and-suspenders)
 */
export default async function RootPage() {
  const session = await getServerSession(authOptions);
  redirect(session?.user ? "/dashboard" : "/auth/signin");
}