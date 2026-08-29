"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import { toFieldErrors } from "@/lib/validation/schemas";
import { requireRole } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/security/audit";
import {
  SAFETY_ALERT_OUTCOMES,
  SAFETY_ALERT_SEVERITIES,
  SAFETY_ALERT_SOURCES,
  SafetyAlertOutcome,
  SafetyAlertSeverity,
  SafetyAlertSource,
  asSafetyAlertOutcome,
  asSafetyAlertSeverity,
  asSafetyAlertSource,
} from "@/lib/domain/enums";

export interface SafetyAlertRow {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  source: SafetyAlertSource;
  sourceId: string;
  severity: SafetyAlertSeverity;
  detail: string;
  acknowledgedAtUTC: string | null;
  acknowledgedByName: string | null;
  resolvedAtUTC: string | null;
  resolvedByName: string | null;
  outcome: SafetyAlertOutcome | null;
  resolutionNotes: string | null;
  createdAtUTC: string;
}

const acknowledgeSchema = z.object({
  alertId: z.string().trim().min(1, "معرّف التنبيه مطلوب"),
});

const resolveSchema = z.object({
  alertId: z.string().trim().min(1, "معرّف التنبيه مطلوب"),
  outcome: z.enum(SAFETY_ALERT_OUTCOMES, {
    message: "يرجى تحديد نتيجة التعامل مع الحالة بشكل صحيح",
  }),
  resolutionNotes: z.string().trim().max(500).optional(),
});

/**
 * ADMIN: Get all active / open safety alerts (unresolved).
 * Unacknowledged alerts appear first, ordered oldest to newest to ensure SLA.
 */
export async function getOpenSafetyAlertsAction(): Promise<ActionResult<SafetyAlertRow[]>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  const alerts = await prisma.safetyAlert.findMany({
    where: { resolvedAt: null },
    orderBy: [{ acknowledgedAt: "asc" }, { createdAt: "asc" }],
    include: {
      patient: {
        select: { fullName: true, phone: true, email: true },
      },
      acknowledgedBy: {
        select: { fullName: true },
      },
      resolvedBy: {
        select: { fullName: true },
      },
    },
  });

  return success(
    alerts.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      patientName: a.patient.fullName,
      patientPhone: a.patient.phone,
      patientEmail: a.patient.email,
      source: asSafetyAlertSource(a.source),
      sourceId: a.sourceId,
      severity: asSafetyAlertSeverity(a.severity),
      detail: a.detail,
      acknowledgedAtUTC: a.acknowledgedAt?.toISOString() ?? null,
      acknowledgedByName: a.acknowledgedBy?.fullName ?? null,
      resolvedAtUTC: a.resolvedAt?.toISOString() ?? null,
      resolvedByName: a.resolvedBy?.fullName ?? null,
      outcome: a.outcome ? asSafetyAlertOutcome(a.outcome) : null,
      resolutionNotes: a.resolutionNotes,
      createdAtUTC: a.createdAt.toISOString(),
    })),
  );
}

/**
 * ADMIN: Acknowledge an emergency safety alert ("I am looking into this").
 */
export async function acknowledgeSafetyAlertAction(
  _prevState: ActionResult<{ alertId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ alertId: string }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;
  const { user: admin } = guard.data;

  const parsed = acknowledgeSchema.safeParse({
    alertId: formData.get("alertId"),
  });
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "معرّف التنبيه غير صالح.", "Invalid alert ID.", toFieldErrors(parsed.error));
  }

  const { alertId } = parsed.data;
  const now = new Date();

  const updated = await prisma.safetyAlert.updateMany({
    where: { id: alertId, acknowledgedAt: null },
    data: {
      acknowledgedAt: now,
      acknowledgedById: admin.id,
    },
  });

  if (updated.count === 0) {
    // Already acknowledged by another admin
    return success({ alertId });
  }

  await recordAudit({
    actorId: admin.id,
    action: "SAFETY_ALERT_ACKNOWLEDGED",
    entityType: "SafetyAlert",
    entityId: alertId,
  });

  revalidatePath("/dashboard/admin");

  return success({ alertId });
}

/**
 * ADMIN: Resolve a safety alert after intervention.
 */
export async function resolveSafetyAlertAction(
  _prevState: ActionResult<{ alertId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ alertId: string }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;
  const { user: admin } = guard.data;

  const parsed = resolveSchema.safeParse({
    alertId: formData.get("alertId"),
    outcome: formData.get("outcome"),
    resolutionNotes: formData.get("resolutionNotes"),
  });
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "بيانات إنهاء التنبيه غير صالحة.", "Invalid resolution data.", toFieldErrors(parsed.error));
  }

  const { alertId, outcome, resolutionNotes } = parsed.data;
  const now = new Date();

  // 1. If never acknowledged before, backfill acknowledgement with this resolving admin (A2 fix)
  await prisma.safetyAlert.updateMany({
    where: { id: alertId, resolvedAt: null, acknowledgedAt: null },
    data: {
      acknowledgedAt: now,
      acknowledgedById: admin.id,
    },
  });

  // 2. Set resolution fields without overwriting previously recorded acknowledgedAt/acknowledgedById
  const updated = await prisma.safetyAlert.updateMany({
    where: { id: alertId, resolvedAt: null },
    data: {
      resolvedAt: now,
      resolvedById: admin.id,
      outcome,
      resolutionNotes: resolutionNotes || null,
    },
  });

  if (updated.count === 0) {
    return failure("CONFLICT", "تمت معالجة هذا التنبيه بالفعل.", "This alert has already been resolved.");
  }

  await recordAudit({
    actorId: admin.id,
    action: "SAFETY_ALERT_RESOLVED",
    entityType: "SafetyAlert",
    entityId: alertId,
    metadata: { outcome },
  });

  revalidatePath("/dashboard/admin");

  return success({ alertId });
}
