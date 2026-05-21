import { NextRequest, NextResponse } from "next/server";

/**
 * MOVE CHECK — Password gate (Next.js 16 proxy convention).
 * - If MOVE_CHECK_ACCESS_PASSWORD is not set, auth is skipped (local dev convenience).
 * - Authenticated sessions are marked with the "move-check-access" cookie.
 * - The cookie is set server-side by the /login server action.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow login page and Next.js internals
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // If no password is configured, skip auth
  if (!process.env.MOVE_CHECK_ACCESS_PASSWORD) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("move-check-access");
  if (cookie?.value === "ok") {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
