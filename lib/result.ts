/**
 * Uniform result envelope for every Server Action.
 *
 * Server Actions must never throw raw errors across the RSC boundary: Next.js
 * replaces them with an opaque "An error occurred in the Server Components
 * render" digest in production, which gives the patient no actionable feedback.
 * Every action therefore returns this discriminated union, and the client
 * components narrow on `ok`.
 *
 * Messages are bilingual because the whole platform is RTL Arabic first with an
 * English fallback (see context/LanguageContext.tsx).
 *
 * NOTE: this module is intentionally free of `server-only` so that client
 * components can import the types for their `useActionState` reducers.
 */

export type ActionErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SLOT_TAKEN"
  | "RATE_LIMITED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_TAKEN"
  | "PHONE_TAKEN"
  | "INVALID_FILE"
  | "INVALID_STATE"
  | "CSRF_FAILED"
  | "INTERNAL_ERROR";

/** Per-field messages keyed by the form field name, for inline form errors. */
export type FieldErrors = Record<string, string>;

export interface ActionFailure {
  ok: false;
  code: ActionErrorCode;
  messageAr: string;
  messageEn: string;
  fieldErrors?: FieldErrors;
}

export interface ActionSuccess<T> {
  ok: true;
  data: T;
}

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function success<T>(data: T): ActionSuccess<T> {
  return { ok: true, data };
}

export function failure(
  code: ActionErrorCode,
  messageAr: string,
  messageEn: string,
  fieldErrors?: FieldErrors,
): ActionFailure {
  return { ok: false, code, messageAr, messageEn, fieldErrors };
}

/** Canonical failures reused across actions, so wording stays consistent. */
export const Failures = {
  unauthenticated: () =>
    failure(
      "UNAUTHENTICATED",
      "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى للمتابعة.",
      "Your session has expired. Please sign in again to continue.",
    ),
  forbidden: () =>
    failure(
      "FORBIDDEN",
      "ليس لديك صلاحية للقيام بهذا الإجراء.",
      "You do not have permission to perform this action.",
    ),
  notFound: (what = "العنصر المطلوب") =>
    failure("NOT_FOUND", `${what} غير موجود.`, "The requested item was not found."),
  csrf: () =>
    failure(
      "CSRF_FAILED",
      "فشل التحقق الأمني من الطلب. يرجى تحديث الصفحة والمحاولة مرة أخرى.",
      "Security check failed. Please refresh the page and try again.",
    ),
  rateLimited: (retryAfterSeconds: number) =>
    failure(
      "RATE_LIMITED",
      `تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة بعد ${retryAfterSeconds} ثانية.`,
      `Too many attempts. Please try again in ${retryAfterSeconds} seconds.`,
    ),
  internal: () =>
    failure(
      "INTERNAL_ERROR",
      "حدث خطأ غير متوقع. تم تسجيل المشكلة وفريق الدعم يعمل عليها.",
      "An unexpected error occurred. The issue has been logged.",
    ),
} as const;
