// src/middleware.ts
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { UserRole } from "@/src/lib/enums";
import { ROUTE_ROLE_GUARDS, meetsRole } from "@/src/lib/auth.config";

export default withAuth(
    function middleware(req: NextRequestWithAuth) {
        const { token } = req.nextauth;
        const { pathname } = req.nextUrl;
        const userRole = token?.role as UserRole | undefined;

        if (!userRole) {
            return NextResponse.redirect(new URL("/auth/signin", req.url));
        }

        for (const guard of ROUTE_ROLE_GUARDS) {
            if (pathname.startsWith(guard.prefix) && !meetsRole(userRole, guard.minRole)) {
                return NextResponse.redirect(new URL("/unauthorized", req.url));
            }
        }

        const res = NextResponse.next();
        res.headers.set("x-user-role", userRole);
        res.headers.set("x-user-id", (token?.dbUserId as string) ?? "");
        return res;
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

/**
 * Match ALL routes EXCEPT public ones:
 *   /auth/*        — sign-in, error pages (public)
 *   /api/auth/*    — NextAuth endpoints (must stay public)
 *   /_next/*       — Next.js internals
 *   static assets  — favicon, icons, images
 *
 * Every app page is protected by default.
 * New pages added to the app are auto-protected — no manual listing needed.
 */
export const config = {
    matcher: [
        "/((?!auth|api/auth|_next/static|_next/image|favicon.ico|icons|images).*)",
    ],
};