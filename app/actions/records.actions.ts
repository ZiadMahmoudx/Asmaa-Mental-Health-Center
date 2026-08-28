"use server";

import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, success } from "@/lib/result";
import { getAuthContext } from "@/lib/auth/session";
import { recordAudit } from "@/lib/security/audit";
import { toStringArray } from "@/lib/serialization";

/**
 * A patient's own clinical records.
 *
 * Separate from doctor.actions.ts on purpose: that module scopes every query to
 * the treating doctor's profile, while this one scopes to the signed-in patient.
 * Keeping the two access paths apart means neither can accidentally widen the
 * other — a patient can never reach another patient's chart, and a doctor's
 * query can never fall back to "all records for this patient".
 *
 * Only signed records are returned. An unsigned note is a draft the doctor is
 * still working on, and showing a patient a diagnosis that may still change
 * would be clinically wrong.
 */

export interface PatientRecordView {
  id: string;
  doctorName: string;
  sessionAtUTC: string;
  chiefComplaint: string | null;
  diagnosis: string;
  dsm5Codes: string[];
  prescriptionNotes: string | null;
  followUpPlan: string | null;
  signedAtUTC: string | null;
}

export async function getMyClinicalRecordsAction(): Promise<ActionResult<PatientRecordView[]>> {
  const auth = await getAuthContext();
  if (!auth) return Failures.unauthenticated();

  const records = await prisma.clinicalRecord.findMany({
    where: { patientId: auth.user.id, signedAt: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      chiefComplaint: true,
      diagnosis: true,
      dsm5CodesJson: true,
      prescriptionNotes: true,
      followUpPlan: true,
      signedAt: true,
      appointment: { select: { scheduledAtUTC: true } },
      doctor: { select: { user: { select: { fullName: true } } } },
    },
  });

  if (records.length > 0) {
    await recordAudit({
      actorId: auth.user.id,
      action: "CLINICAL_RECORD_VIEWED",
      entityType: "ClinicalRecord",
      entityId: auth.user.id,
      metadata: { by: "PATIENT", count: records.length },
    });
  }

  return success(
    records.map((record) => ({
      id: record.id,
      doctorName: record.doctor.user.fullName,
      sessionAtUTC: record.appointment.scheduledAtUTC.toISOString(),
      chiefComplaint: record.chiefComplaint,
      diagnosis: record.diagnosis,
      dsm5Codes: toStringArray(record.dsm5CodesJson),
      prescriptionNotes: record.prescriptionNotes,
      followUpPlan: record.followUpPlan,
      signedAtUTC: record.signedAt?.toISOString() ?? null,
    })),
  );
}
