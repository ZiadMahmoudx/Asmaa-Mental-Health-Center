import "server-only";
import { prisma } from "@/lib/prisma";
import { getRequestIp } from "@/lib/auth/session";

/**
 * Append-only audit trail.
 *
 * Recorded for every privileged or money-adjacent action. Deliberately never
 * stores clinical free-text: the metadata blob is limited to identifiers,
 * status transitions and amounts, so exporting the audit log for a compliance
 * review does not export protected health information.
 */

export type AuditAction =
  | "USER_REGISTERED"
  | "USER_LOGGED_IN"
  | "USER_LOGIN_FAILED"
  | "USER_LOGGED_OUT"
  | "APPOINTMENT_RESERVED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_COMPLETED"
  | "HOLD_EXPIRED_RECLAIMED"
  | "PAYMENT_PROOF_SUBMITTED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "ZOOM_LINK_ASSIGNED"
  | "RECEIPT_VIEWED"
  | "AVAILABILITY_UPDATED"
  | "CLINICAL_RECORD_SAVED"
  | "CLINICAL_RECORD_VIEWED";

export interface AuditInput {
  actorId: string | null;
  action: AuditAction;
  entityType: "User" | "Appointment" | "PaymentProof" | "ClinicalRecord" | "DoctorAvailability";
  entityId: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Write an audit entry. Never throws: a failure to log must not roll back or
 * block the clinical action the user is performing, but it is surfaced on the
 * server console so the gap is visible in the logs.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: await getRequestIp(),
      },
    });
  } catch (error) {
    console.error("[audit] failed to persist audit entry", {
      action: input.action,
      entityId: input.entityId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
