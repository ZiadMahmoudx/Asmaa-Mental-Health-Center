import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE, SESSION_COOKIE } from "@/lib/constants";

/**
 * Edge middleware: cheap gate plus CSRF cookie seeding.
 *
 * Scope is deliberately narrow. Middleware runs on the Edge runtime, where
 * Prisma is unavailable, so it cannot tell a valid session from a forged cookie
 * and it cannot read a user's role. Treating it as the authorisation layer would
 * be a mistake - it exists here to bounce obviously-signed-out visitors away from
 * dashboard routes before a full render, and to make sure every visitor has a
 * CSRF token before they reach a form.
 *
 * The real checks are `requireRolePage` in each protected page and `requireRole`
 * inside every Server Action; both hit the database and both re-verify the role.
 */

const PROTECTED_PREFIXES = ["/dashboard", "/payment"];

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  let response: NextResponse;

  if (!hasSessionCookie && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    response = NextResponse.redirect(loginUrl);
  } else {
    response = NextResponse.next();
  }

  // NOTE: middleware deliberately does NOT bounce cookie-holding visitors away
  // from /login and /register.
  //
  // The presence of a cookie is not the same as a valid session. A session that
  // has been revoked (signed out on another device, locked out by an admin) or
  // has expired leaves the cookie sitting in the browser. Redirecting on the
  // cookie alone produced an infinite loop: /dashboard found no valid session
  // and redirected to /login, middleware saw the stale cookie and redirected
  // back to /dashboard, forever.
  //
  // /login and /register instead resolve the session against the database and
  // redirect only when it is genuinely valid.

  // Seed a CSRF token for visitors who do not have one yet, so the login and
  // registration forms always render with a valid hidden field.
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, randomToken(), {
      httpOnly: false, // read back by the page to populate the hidden field
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");

  return response;
}

export const config = {
  // Everything except Next internals and static assets. The receipts API is
  // intentionally included so it inherits the security headers.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
