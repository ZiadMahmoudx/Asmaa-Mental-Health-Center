/**
 * Domain enumerations — the portable replacement for Prisma `enum` blocks.
 *
 * WHY THESE ARE NOT PRISMA ENUMS
 * ------------------------------
 * Microsoft SQL Server has no native enum type, so Prisma rejects `enum` blocks
 * on the `sqlserver` provider entirely. Because this platform has to run on both
 * SQL Server and PostgreSQL from one schema, the enumerations live here as
 * TypeScript unions and the database columns are plain strings.
 *
 * Nothing is lost in the move. The values are still exhaustively typed at every
 * call site, Zod validates them at the network boundary (lib/validation/schemas.ts
 * builds its enums from these same arrays), and the database keeps a CHECK-style
 * guarantee through the application layer rather than the column type. The gain
 * is that a provider switch is a configuration change instead of a schema rewrite.
 *
 * Pure module: no `server-only`, so client components can import the labels and
 * the union types for their props.
 */

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ROLES = ["PATIENT", "DOCTOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export const APPOINTMENT_TYPES = ["ONLINE", "OFFLINE"] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const APPOINTMENT_STATUSES = [
  "PENDING_PAYMENT_PROOF", // slot held, patient has not uploaded a receipt yet
  "PAYMENT_UNDER_REVIEW", // receipt uploaded, waiting on the Admin Verification Desk
  "CONFIRMED", // admin approved the transfer; Zoom link / clinic details issued
  "COMPLETED", // session took place
  "CANCELLED", // cancelled by patient or admin
  "REJECTED", // admin rejected the payment proof
  "EXPIRED", // hold elapsed before any proof was submitted; slot released
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/**
 * Statuses that keep a time slot occupied. Anything not listed here releases the
 * slot back to the calendar. Single source of truth for the booking queries.
 */
export const OCCUPYING_STATUSES: readonly AppointmentStatus[] = [
  "PENDING_PAYMENT_PROOF",
  "PAYMENT_UNDER_REVIEW",
  "CONFIRMED",
  "COMPLETED",
];

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const PAYMENT_METHODS = ["INSTAPAY", "VODAFONE_CASH", "CREDIT"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_PROOF_STATUSES = ["UNDER_REVIEW", "APPROVED", "REJECTED"] as const;
export type PaymentProofStatus = (typeof PAYMENT_PROOF_STATUSES)[number];

// ---------------------------------------------------------------------------
// Verification & clinical
// ---------------------------------------------------------------------------

export const VERIFICATION_PURPOSES = ["PHONE_VERIFICATION", "PASSWORD_RESET"] as const;
export type VerificationPurpose = (typeof VERIFICATION_PURPOSES)[number];

export const RISK_LEVELS = ["LOW", "MODERATE", "HIGH"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

// ---------------------------------------------------------------------------
// Patient Credits
// ---------------------------------------------------------------------------

export const CREDIT_KINDS = [
  "CANCELLATION",
  "MANUAL_ADJUSTMENT",
  "APPLIED_TO_BOOKING",
  "PAID_OUT",
] as const;
export type CreditKind = (typeof CREDIT_KINDS)[number];

// ---------------------------------------------------------------------------
// Safety Alerts & Clinical Assessment Statuses
// ---------------------------------------------------------------------------

export const SAFETY_ALERT_SOURCES = ["INTAKE", "ASSESSMENT"] as const;
export type SafetyAlertSource = (typeof SAFETY_ALERT_SOURCES)[number];

export const SAFETY_ALERT_SEVERITIES = ["CRISIS", "ELEVATED"] as const;
export type SafetyAlertSeverity = (typeof SAFETY_ALERT_SEVERITIES)[number];

export const SAFETY_ALERT_OUTCOMES = [
  "CONTACTED",
  "NO_ANSWER",
  "ESCALATED_EMERGENCY",
  "FALSE_POSITIVE",
] as const;
export type SafetyAlertOutcome = (typeof SAFETY_ALERT_OUTCOMES)[number];

export const ASSESSMENT_STATUSES = ["DRAFT", "COMPLETED"] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const ASSESSMENT_TYPES = [
  "PHQ9",
  "GAD7",
  "ISI",
  "PCL5",
  "OCIR",
  "AUDIT",
  "DAST10",
  "ASRS",
] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Narrowing helpers
// ---------------------------------------------------------------------------

/**
 * Because the columns are strings, a value read back from the database is typed
 * as `string`. These guards narrow it once, at the edge, instead of scattering
 * casts through the actions.
 */
function makeGuard<T extends string>(values: readonly T[]) {
  const set = new Set<string>(values);
  return (value: string): value is T => set.has(value);
}

export const isRole = makeGuard(ROLES);
export const isAppointmentType = makeGuard(APPOINTMENT_TYPES);
export const isAppointmentStatus = makeGuard(APPOINTMENT_STATUSES);
export const isPaymentMethod = makeGuard(PAYMENT_METHODS);
export const isPaymentProofStatus = makeGuard(PAYMENT_PROOF_STATUSES);
export const isCreditKind = makeGuard(CREDIT_KINDS);
export const isSafetyAlertSource = makeGuard(SAFETY_ALERT_SOURCES);
export const isSafetyAlertSeverity = makeGuard(SAFETY_ALERT_SEVERITIES);
export const isSafetyAlertOutcome = makeGuard(SAFETY_ALERT_OUTCOMES);
export const isAssessmentStatus = makeGuard(ASSESSMENT_STATUSES);
export const isAssessmentType = makeGuard(ASSESSMENT_TYPES);

/**
 * Narrow a database string, falling back to a safe default if the row somehow
 * holds a value outside the union (a hand-edited row, or a value written by an
 * older deployment). Returning a default rather than throwing keeps one bad row
 * from taking down a whole listing page.
 */
export function asRole(value: string): Role {
  return isRole(value) ? value : "PATIENT";
}

export function asAppointmentType(value: string): AppointmentType {
  return isAppointmentType(value) ? value : "ONLINE";
}

export function asAppointmentStatus(value: string): AppointmentStatus {
  return isAppointmentStatus(value) ? value : "CANCELLED";
}

export function asPaymentMethod(value: string): PaymentMethod {
  return isPaymentMethod(value) ? value : "INSTAPAY";
}

export function asPaymentProofStatus(value: string): PaymentProofStatus {
  return isPaymentProofStatus(value) ? value : "UNDER_REVIEW";
}

export function asCreditKind(value: string): CreditKind {
  return isCreditKind(value) ? value : "MANUAL_ADJUSTMENT";
}

export function asSafetyAlertSource(value: string): SafetyAlertSource {
  return isSafetyAlertSource(value) ? value : "ASSESSMENT";
}

export function asSafetyAlertSeverity(value: string): SafetyAlertSeverity {
  return isSafetyAlertSeverity(value) ? value : "ELEVATED";
}

export function asSafetyAlertOutcome(value: string | null): SafetyAlertOutcome | null {
  if (!value) return null;
  return isSafetyAlertOutcome(value) ? value : null;
}

export function asAssessmentStatus(value: string): AssessmentStatus {
  return isAssessmentStatus(value) ? value : "COMPLETED";
}

export function asAssessmentType(value: string): AssessmentType {
  return isAssessmentType(value) ? value : "PHQ9";
}


