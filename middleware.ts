import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { readAuthJwtFromCookieHeader } from "@/lib/read-auth-jwt";

type JwtWithRole = { role?: Role };

/**
 * Route protection using the session JWT from the Cookie header (no internal HTTP).
 * Uses the same dual cookie-name logic as `getSessionFromCookies` in lib/auth.ts.
 */
export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[middleware] AUTH_SECRET or NEXTAUTH_SECRET is missing — protected routes are not enforced."
      );
    }
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = await readAuthJwtFromCookieHeader(cookieHeader, secret);

  const isLoggedIn = !!token;
  const role = (token as JwtWithRole | null)?.role;

  const path = request.nextUrl.pathname;

  /** One-time impersonation handoff (HMAC token); page completes sign-in client-side. */
  if (path.startsWith("/auth/impersonate")) {
    return NextResponse.next();
  }

  if (path.startsWith("/sup-admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (path.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (path === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico).*)",
    "/",
  ],
};
