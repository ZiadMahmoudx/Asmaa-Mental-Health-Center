"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { asRole } from "@/lib/domain/enums";
import { prisma } from "@/lib/prisma";
import { ActionFailure, ActionResult, Failures, failure, success } from "@/lib/result";
import { loginSchema, registerSchema, toFieldErrors } from "@/lib/validation/schemas";
import { fakeVerifyPassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  destroyCurrentSession,
  getAuthContext,
  getRequestIp,
  revokeAllSessions,
  SafeUser,
} from "@/lib/auth/session";
import { verifyCsrfFromForm } from "@/lib/auth/csrf";
import { dashboardPathForRole } from "@/lib/auth/guards";
import { consumeRateLimit, RateLimits, resetRateLimit } from "@/lib/security/rate-limit";
import { recordAudit } from "@/lib/security/audit";

/**
 * Authentication actions.
 *
 * Shape contract: each action returns an `ActionResult`, except where a redirect
 * is the intended outcome. `redirect()` works by throwing a special control-flow
 * signal, so it is always called AFTER every await that must complete and never
 * inside a try/catch that would swallow it.
 */

export interface AuthenticatedUserPayload {
  user: SafeUser;
  redirectTo: string;
}

/** Only relative in-app paths are honoured, so `?next=` cannot become an open redirect. */
function safeRedirectPath(candidate: string | undefined, fallback: string): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  return candidate;
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export async function registerAction(
  _prevState: ActionResult<AuthenticatedUserPayload> | null,
  formData: FormData,
): Promise<ActionResult<AuthenticatedUserPayload>> {
  if (!(await verifyCsrfFromForm(formData))) return Failures.csrf();

  const ip = (await getRequestIp()) ?? "unknown";
  const throttle = consumeRateLimit(`register:${ip}`, RateLimits.register);
  if (!throttle.allowed) return Failures.rateLimited(throttle.retryAfterSeconds);

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms") === "on" || formData.get("acceptTerms") === "true",
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى مراجعة البيانات المدخلة.",
      "Please review the details you entered.",
      toFieldErrors(parsed.error),
    );
  }

  const { fullName, email, phone, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  let userId: string;
  let user: SafeUser;

  try {
    // Self-registration always creates a PATIENT. Doctor and admin accounts are
    // provisioned by the clinic (prisma/seed.ts), never through a public form -
    // otherwise anyone could POST role=DOCTOR and read clinical records.
    const created = await prisma.user.create({
      data: { fullName, email, phone, passwordHash, role: "PATIENT" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        phoneVerifiedAt: true,
        createdAt: true,
      },
    });
    userId = created.id;
    // The column is a portable `String`; narrow it to the Role union once here.
    user = { ...created, role: asRole(created.role) };
  } catch (error) {
    // P2002 = unique constraint. The failing column tells us which field to flag.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      if (target.includes("phone")) {
        return failure(
          "PHONE_TAKEN",
          "رقم الهاتف مسجل بالفعل. يمكنك تسجيل الدخول أو استخدام رقم آخر.",
          "This phone number is already registered.",
          { phone: "رقم الهاتف مسجل بالفعل" },
        );
      }
      return failure(
        "EMAIL_TAKEN",
        "البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول مباشرة.",
        "This email address is already registered.",
        { email: "البريد الإلكتروني مسجل بالفعل" },
      );
    }
    console.error("[auth] registration failed", error);
    return Failures.internal();
  }

  await createSession(userId);
  await recordAudit({
    actorId: userId,
    action: "USER_REGISTERED",
    entityType: "User",
    entityId: userId,
    metadata: { role: "PATIENT" },
  });

  return success({ user, redirectTo: dashboardPathForRole(user.role) });
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function loginAction(
  _prevState: ActionResult<AuthenticatedUserPayload> | null,
  formData: FormData,
): Promise<ActionResult<AuthenticatedUserPayload>> {
  if (!(await verifyCsrfFromForm(formData))) return Failures.csrf();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى إدخال البريد الإلكتروني وكلمة المرور.",
      "Please enter your email address and password.",
      toFieldErrors(parsed.error),
    );
  }

  const { email, password, next } = parsed.data;
  const ip = (await getRequestIp()) ?? "unknown";

  // Throttled on both axes: per IP (credential stuffing across many accounts)
  // and per email (a targeted attack rotating through proxies).
  const ipKey = `login:ip:${ip}`;
  const accountKey = `login:email:${email}`;

  for (const key of [ipKey, accountKey]) {
    const throttle = consumeRateLimit(key, RateLimits.login);
    if (!throttle.allowed) return Failures.rateLimited(throttle.retryAfterSeconds);
  }

  const record = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      phoneVerifiedAt: true,
      createdAt: true,
      passwordHash: true,
      isActive: true,
    },
  });

  const invalidCredentials = failure(
    "INVALID_CREDENTIALS",
    "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "Incorrect email address or password.",
  );

  if (!record) {
    // Burn equivalent argon2 work so a missing account is not detectable by timing.
    await fakeVerifyPassword(password);
    return invalidCredentials;
  }

  const passwordMatches = await verifyPassword(record.passwordHash, password);

  if (!passwordMatches) {
    await recordAudit({
      actorId: record.id,
      action: "USER_LOGIN_FAILED",
      entityType: "User",
      entityId: record.id,
    });
    return invalidCredentials;
  }

  if (!record.isActive) {
    return failure(
      "FORBIDDEN",
      "هذا الحساب موقوف حالياً. يرجى التواصل مع إدارة المركز.",
      "This account is suspended. Please contact the clinic administration.",
    );
  }

  const { passwordHash: _hash, isActive: _active, role, ...rest } = record;
  const user: SafeUser = { ...rest, role: asRole(role) };

  await createSession(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  resetRateLimit(ipKey);
  resetRateLimit(accountKey);

  await recordAudit({
    actorId: user.id,
    action: "USER_LOGGED_IN",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role },
  });

  return success({
    user,
    redirectTo: safeRedirectPath(next, dashboardPathForRole(user.role)),
  });
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

/**
 * Form-driven logout.
 *
 * Uses the `(prevState, formData)` shape so it can be bound with
 * `useActionState`: a plain `<form action={fn}>` may only return void, which
 * would leave a failed CSRF check with nowhere to report itself. On success the
 * redirect ends the request, so only the failure branch ever returns.
 */
export async function logoutAction(
  _prevState: ActionFailure | null,
  formData: FormData,
): Promise<ActionFailure | null> {
  if (!(await verifyCsrfFromForm(formData))) return Failures.csrf();

  const auth = await getAuthContext();
  await destroyCurrentSession();

  if (auth) {
    await recordAudit({
      actorId: auth.user.id,
      action: "USER_LOGGED_OUT",
      entityType: "User",
      entityId: auth.user.id,
    });
  }

  redirect("/login");
}

/** Sign out of every device - offered after a suspected account compromise. */
export async function logoutEverywhereAction(
  formData: FormData,
): Promise<ActionResult<{ revoked: number }>> {
  if (!(await verifyCsrfFromForm(formData))) return Failures.csrf();

  const auth = await getAuthContext();
  if (!auth) return Failures.unauthenticated();

  const revoked = await revokeAllSessions(auth.user.id);
  await destroyCurrentSession();

  await recordAudit({
    actorId: auth.user.id,
    action: "USER_LOGGED_OUT",
    entityType: "User",
    entityId: auth.user.id,
    metadata: { scope: "all_devices", revoked },
  });

  return success({ revoked });
}

// ---------------------------------------------------------------------------
// Session inspection
// ---------------------------------------------------------------------------

/**
 * Current user for client components that cannot call `getAuthContext` directly.
 * Returns null rather than an error when signed out - callers treat that as the
 * guest state, not a failure.
 */
export async function getCurrentUserAction(): Promise<SafeUser | null> {
  const auth = await getAuthContext();
  return auth?.user ?? null;
}
