import "server-only";
import { cookies, headers } from "next/headers";
import { CSRF_COOKIE, CSRF_FIELD, CSRF_HEADER } from "@/lib/constants";
import { env } from "@/lib/env";
import { generateToken, safeEquals, sha256Hex } from "@/lib/auth/password";
import { getAuthContext } from "@/lib/auth/session";

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

/** Reject cross-site state-changing requests by Origin, falling back to Referer. */
async function isSameOrigin(): Promise<boolean> {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin === env.APP_URL;

  const referer = headerList.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === env.APP_URL;
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
  const auth = await getAuthContext();
  if (auth && !safeEquals(sha256Hex(token), auth.csrfTokenHash)) return false;

  return true;
}

/** Convenience wrapper for actions that receive a FormData payload. */
export async function verifyCsrfFromForm(formData: FormData): Promise<boolean> {
  const value = formData.get(CSRF_FIELD);
  return verifyCsrf(typeof value === "string" ? value : null);
}
