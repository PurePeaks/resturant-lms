import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { ROLE_DASHBOARD } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

// Fast, token-based routing only. Authorization is enforced again against the
// database in every page and API route (see src/lib/session.ts).
export default auth(function middleware(req) {
  const { pathname } = req.nextUrl;
  // NextAuth v5 attaches the session on req.auth
  const user = req.auth?.user as { role?: UserRole; mustChangePassword?: boolean } | undefined;
  const role = user?.role;

  // ── Public routes ──────────────────────────────────────────────────────
  if (pathname === "/login") {
    if (role) {
      const target = user?.mustChangePassword ? "/change-password" : ROLE_DASHBOARD[role];
      return NextResponse.redirect(new URL(target, req.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.next();
  }

  // ── Forced password change ─────────────────────────────────────────────
  if (pathname === "/change-password") {
    if (!req.auth) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
  }

  // ── Protected: /dashboard/** ───────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!req.auth) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (user?.mustChangePassword) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }
    if (role) {
      const allowedBase = ROLE_DASHBOARD[role];
      if (!pathname.startsWith(allowedBase)) {
        return NextResponse.redirect(new URL(allowedBase, req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/login", "/change-password", "/dashboard/:path*"],
};
