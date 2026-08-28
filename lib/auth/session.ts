import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { User } from "@prisma/client";
import { asRole, type Role } from "@/lib/domain/enums";
import { prisma } from "@/lib/prisma";
import { env, isProduction } from "@/lib/env";
import { CSRF_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { generateToken, sha256Hex } from "@/lib/auth/password";

/**
 * Server-side opaque sessions.
 *
 * Design: the cookie holds a 256-bit random token; the database stores only its
 * SHA-256 digest. That gives three properties a stateless JWT would not:
 *   - instant revocation (logout, password change, admin lockout),
 *   - a stolen database dump cannot be replayed as a valid cookie,
 *   - no signature-algorithm confusion surface.
 *
 * Every session also carries a CSRF token digest, used for the double-submit
 * check in lib/auth/csrf.ts.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = env.SESSION_TTL_DAYS * DAY_MS;

/**
 * Fields safe to hand to client components - never includes passwordHash.
 *
 * `role` is narrowed from the column's `string` to the `Role` union here, at the
 * single point where a user row enters the application. Everything downstream
 * gets exhaustive checking without repeating the cast.
 */
export type SafeUser = Omit<
  Pick<User, "id" | "fullName" | "email" | "phone" | "role" | "phoneVerifiedAt" | "createdAt">,
  "role"
> & { role: Role };

export interface AuthContext {
  user: SafeUser;
  sessionId: string;
  csrfTokenHash: string;
}

const SAFE_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  phoneVerifiedAt: true,
  createdAt: true,
} as const;

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Client IP, trusting the proxy headers Vercel / nginx set in front of Next. */
export async function getRequestIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  return headerList.get("x-real-ip")?.slice(0, 64) ?? null;
}

export async function getRequestUserAgent(): Promise<string | null> {
  const headerList = await headers();
  return headerList.get("user-agent")?.slice(0, 255) ?? null;
}

/**
 * Issue a fresh session and write both cookies. Called only from Server Actions
 * (register / login), where cookie mutation is permitted.
 *
 * A brand-new row is always created rather than reusing an existing one, which
 * is what prevents session fixation: a token an attacker planted before login
 * never becomes authenticated.
 */
export async function createSession(userId: string): Promise<{ csrfToken: string }> {
  const sessionToken = generateToken(32);
  const csrfToken = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256Hex(sessionToken),
      csrfTokenHash: sha256Hex(csrfToken),
      userAgent: await getRequestUserAgent(),
      ipAddress: await getRequestIp(),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);

  cookieStore.set(SESSION_COOKIE, sessionToken, cookieOptions(maxAge));
  // The CSRF cookie is deliberately readable by JavaScript: the double-submit
  // pattern requires the page to echo it back in a form field or header.
  cookieStore.set(CSRF_COOKIE, csrfToken, {
    ...cookieOptions(maxAge),
    httpOnly: false,
  });

  return { csrfToken };
}

/**
 * Resolve the caller's session.
 *
 * Wrapped in React `cache` so that a page rendering a layout, a header and three
 * server components performs exactly one database round-trip per request.
 * Read-only: it never mutates cookies, so it is safe to call during RSC render.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256Hex(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      csrfTokenHash: true,
      user: { select: { ...SAFE_USER_SELECT, isActive: true } },
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (!session.user.isActive) return null;

  const { isActive: _isActive, role, ...rest } = session.user;
  const safeUser: SafeUser = { ...rest, role: asRole(role) };

  // Sliding renewal: extend the database expiry once the session is past its
  // half-life so an active user is not logged out mid-consultation. The cookie
  // itself can only be refreshed from an action or route handler, hence the
  // guarded write - during an RSC render Next.js rejects cookie mutation and we
  // simply skip it (the database row is what actually gates access).
  const halfLife = session.expiresAt.getTime() - SESSION_TTL_MS / 2;
  if (Date.now() > halfLife) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt },
    });
    try {
      cookieStore.set(SESSION_COOKIE, token, cookieOptions(Math.floor(SESSION_TTL_MS / 1000)));
    } catch {
      /* read-only render context - database expiry has already been extended */
    }
  }

  return {
    user: safeUser,
    sessionId: session.id,
    csrfTokenHash: session.csrfTokenHash,
  };
});

/** Revoke the current session and clear both cookies. Idempotent. */
export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: sha256Hex(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

/** Revoke every session for a user - used after a password change or lockout. */
export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

/**
 * Delete expired and long-revoked sessions. Safe to call from a cron route; it
 * keeps the sessions table from growing without bound.
 */
export async function pruneStaleSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * DAY_MS);
  const result = await prisma.session.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }],
    },
  });
  return result.count;
}

/** Role hierarchy helper - ADMIN implicitly satisfies any role requirement. */
export function hasRole(userRole: Role, allowed: readonly Role[]): boolean {
  return userRole === "ADMIN" || allowed.includes(userRole);
}
