/**
 * Cross-cutting constants. Kept free of `server-only` because a few values
 * (cookie names, accepted MIME types, status labels) are also needed by client
 * components rendering the booking and admin screens.
 */

/**
 * Value written to Appointment.slotLockKey while an appointment occupies its
 * time slot. Together with the composite unique index
 * `@@unique([doctorId, scheduledAtUTC, slotLockKey])` this makes the database
 * itself reject a second live booking for the same doctor and instant.
 *
 * Releasing a slot means rewriting slotLockKey to the appointment's own id
 * (globally unique), which frees the (doctor, instant, ACTIVE) tuple without
 * deleting the historical row.
 */
export const ACTIVE_SLOT_LOCK = "ACTIVE" as const;

/**
 * Value written to DoctorAvailability.ruleLockKey while a working window is active.
 * Retiring a window rewrites ruleLockKey to the row's own id, freeing the
 * (doctorId, dayOfWeek, startMinutesUTC, endMinutesUTC, ACTIVE) tuple so the same
 * window can be re-created without P2002 collision.
 */
export const ACTIVE_RULE_LOCK = "ACTIVE" as const;

/**
 * Maximum time in hours a payment proof may sit in PAYMENT_UNDER_REVIEW
 * before the unconfirmed calendar slot is automatically released to avoid
 * indefinite doctor calendar blockage.
 */
export const PAYMENT_REVIEW_SLA_HOURS = 48;

export const SESSION_COOKIE = "asmaa_session";
export const CSRF_COOKIE = "asmaa_csrf";
/** Form field / header name carrying the double-submit CSRF token. */
export const CSRF_FIELD = "csrfToken";
export const CSRF_HEADER = "x-asmaa-csrf";

/** Receipt uploads: images plus PDF, which is what banking apps export. */
export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type AllowedReceiptMimeType = (typeof ALLOWED_RECEIPT_MIME_TYPES)[number];

/** Magic-number prefixes used to verify the real file type (see lib/uploads.ts). */
export const RECEIPT_MAGIC_NUMBERS: Record<AllowedReceiptMimeType, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // "RIFF", plus "WEBP" at offset 8
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // "%PDF"
};

export const SESSION_DURATIONS = [30, 45, 60] as const;
export type SessionDuration = (typeof SESSION_DURATIONS)[number];

/** Bilingual labels for appointment status chips. */
export const APPOINTMENT_STATUS_LABELS = {
  PENDING_PAYMENT_PROOF: { ar: "بانتظار إيصال الدفع", en: "Awaiting payment proof" },
  PAYMENT_UNDER_REVIEW: { ar: "الدفع قيد المراجعة", en: "Payment under review" },
  CONFIRMED: { ar: "مؤكد", en: "Confirmed" },
  COMPLETED: { ar: "مكتمل", en: "Completed" },
  CANCELLED: { ar: "ملغي", en: "Cancelled" },
  REJECTED: { ar: "مرفوض", en: "Rejected" },
  EXPIRED: { ar: "انتهت مهلة الحجز", en: "Hold expired" },
} as const;

export const PAYMENT_METHOD_LABELS = {
  INSTAPAY: { ar: "إنستا باي", en: "InstaPay" },
  VODAFONE_CASH: { ar: "فودافون كاش", en: "Vodafone Cash" },
  CREDIT: { ar: "رصيد مريض", en: "Patient Credit" },
} as const;

export const APPOINTMENT_TYPE_LABELS = {
  ONLINE: { ar: "جلسة أونلاين (زووم)", en: "Online session (Zoom)" },
  OFFLINE: { ar: "زيارة بالعيادة", en: "In-person clinic visit" },
} as const;
