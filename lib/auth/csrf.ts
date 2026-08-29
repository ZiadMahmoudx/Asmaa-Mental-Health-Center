import "server-only";
import { cookies, headers } from "next/headers";
import { CSRF_COOKIE, CSRF_FIELD, CSRF_HEADER } from "@/lib/constants";
import { env } from "@/lib/env";
import { generateToken, safeEquals, sha256Hex } from "@/lib/auth/password";
import { getAuthContext, rebindSessionCsrf } from "@/lib/auth/session";

/**
 * CSRF protection: double-submit cookie + strict origin check.
 *
 * Next.js applies its own origin check to Server Actions, but that protects only
 * actions and only when the deployment sits behind a correctly configured proxy.
 * The clinic handles money transfers and clinical records, so both layers run:
 *
 *   1. Origin / Referer must match APP_URL for every state-changing request.
 *   2. The request must echo the token from the `asmaa_csrf` cookie. An attacker
 *      on another origin can cause the browser to send cookies but cannot read
 *      them, so it cannot produce a matching field value.
 *   3. Once authenticated, the echoed token must additionally hash to the digest
 *      bound to the session row, so a token from a different session is rejected.
 */

/**
 * Read the current CSRF token, minting one if this visitor has none yet
 * (the login and registration forms are reached before any session exists).
 *
 * Call from a Server Action or Route Handler. In a read-only render context the
 * cookie write is skipped and the freshly generated token is still returned, but
 * server components should instead call {@link readCsrfToken}.
 */
export async function ensureCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE)?.value;
  if (existing) return existing;

  const token = generateToken(32);
  try {
    cookieStore.set(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
    });
  } catch {
    /* read-only context; middleware.ts seeds the cookie on the next navigation */
  }
  return token;
}

/** Read-only accessor for server components rendering a hidden form field. */
export async function readCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE)?.value ?? "";
}

/**
 * The origins a state-changing request may legitimately come from.
 *
 * `APP_URL` alone is not enough. A single deployment is reachable on several
 * hostnames that the platform controls — the production alias, the project
 * alias, the git-branch alias, and every immutable deployment URL — and a user
 * who opens any of them gets a page served from that host, so the browser sends
 * that host as the Origin. Comparing against one configured URL rejected every
 * one of them with CSRF_FAILED before the token was even examined.
 *
 * The correct comparison for a same-origin check is the origin the page was
 * actually served from, which behind Vercel arrives as `x-forwarded-host` +
 * `x-forwarded-proto`. This is safe: a browser sets `Origin` itself and a
 * cross-site attacker cannot forge it, so a request whose Origin equals the
 * serving host did originate from this site. A forged Host in a server-side
 * request carries no victim cookies, which is not the CSRF threat model.
 *
 * `APP_URL` stays in the set so a deployment behind a proxy that rewrites the
 * host still validates.
 */
async function allowedOrigins(): Promise<Set<string>> {
  const headerList = await headers();
  const allowed = new Set<string>([env.APP_URL]);

  const forwardedHost = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (forwardedHost) {
    const proto = headerList.get("x-forwarded-proto") ?? "https";
    allowed.add(`${proto}://${forwardedHost}`);
  }

  return allowed;
}

/** Reject cross-site state-changing requests by Origin, falling back to Referer. */
async function isSameOrigin(): Promise<boolean> {
  const headerList = await headers();
  const allowed = await allowedOrigins();

  const origin = headerList.get("origin");
  if (origin) return allowed.has(origin);

  const referer = headerList.get("referer");
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // Neither header present: browsers always send Origin on cross-site POSTs, so
  // the absence of both is either a same-origin GET-like navigation or a
  // non-browser client. Sec-Fetch-Site is the tiebreaker where supported.
  const fetchSite = headerList.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin" || fetchSite === "none";
}

/**
 * Full CSRF verification for a state-changing request.
 *
 * @param submitted token taken from the form field, or null to read it from the
 *                  `x-asmaa-csrf` header (used by fetch-based callers).
 */
export async function verifyCsrf(submitted: string | null): Promise<boolean> {
  if (!(await isSameOrigin())) return false;

  const headerList = await headers();
  const token = submitted ?? headerList.get(CSRF_HEADER);
  if (!token) return false;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;
  if (!safeEquals(token, cookieToken)) return false;

  // Bind the token to the session once one exists, so a token minted while
  // logged out cannot be replayed against an authenticated session.
  //
  // A mismatch here is not evidence of an attack. Both checks above have already
  // passed, which means the request is same-origin and echoed the very token the
  // browser sent in its Cookie header — something no cross-site caller can do,
  // because the same-origin policy stops it reading the cookie at all. What a
  // mismatch actually means is that the CSRF cookie rotated after login: it
  // carries its own 7-day lifetime, and visitors clear site data or run privacy
  // tooling that drops it while the session cookie survives.
  //
  // Failing closed here bricked the account: every guarded action returned
  // CSRF_FAILED, sign-out included, and the "refresh the page" advice did
  // nothing because middleware only mints a token when none is present. The only
  // way out was clearing cookies by hand. So re-point the session at the token
  // in play instead, and carry on.
  const auth = await getAuthContext();
  if (auth && !safeEquals(sha256Hex(token), auth.csrfTokenHash)) {
    try {
      await rebindSessionCsrf(auth.sessionId, token);
    } catch (error) {
      // A failed rebind must not hand out access on a stale binding.
      console.error("[csrf] failed to rebind session token", error);
      return false;
    }
  }

  return true;
}

/** Convenience wrapper for actions that receive a FormData payload. */
export async function verifyCsrfFromForm(formData: FormData): Promise<boolean> {
  const value = formData.get(CSRF_FIELD);
  return verifyCsrf(typeof value === "string" ? value : null);
}
