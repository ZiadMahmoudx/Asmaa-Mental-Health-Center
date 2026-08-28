"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  asAppointmentStatus,
  asAppointmentType,
  type AppointmentStatus,
} from "@/lib/domain/enums";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import {
  availabilityRuleSchema,
  clinicalRecordSchema,
  completeAppointmentSchema,
  deleteAvailabilitySchema,
  timeOffSchema,
  toFieldErrors,
} from "@/lib/validation/schemas";
import { requireRole } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/security/audit";
import { fromStringArray, toEgp, toStringArray } from "@/lib/serialization";
import { getClinicConfig } from "@/lib/clinic-config";
import { sessionReminderLink } from "@/lib/whatsapp";

/**
 * Doctor-facing actions: agenda management and clinical documentation.
 *
 * Ownership is the theme. A doctor is authenticated as a User, but all clinical
 * data hangs off their DoctorProfile, so every action resolves the profile from
 * the session and scopes each query by that id. No action ever accepts a
 * `doctorId` from the request body - that is what would let one doctor read or
 * edit another's patients.
 */

const MINUTE_MS = 60_000;

/** Resolve the signed-in doctor's profile id, or a typed failure. */
async function resolveDoctorProfile(
  userId: string,
): Promise<ActionResult<{ doctorId: string; fullName: string; roomNumber: string | null }>> {
  const profile = await prisma.doctorProfile.findUnique({
    where: { userId },
    select: { id: true, roomNumber: true, user: { select: { fullName: true } } },
  });

  if (!profile) {
    return failure(
      "FORBIDDEN",
      "لا يوجد ملف طبيب مرتبط بهذا الحساب. يرجى التواصل مع إدارة المركز.",
      "No doctor profile is linked to this account.",
    );
  }

  return success({
    doctorId: profile.id,
    fullName: profile.user.fullName,
    roomNumber: profile.roomNumber,
  });
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

export interface DoctorAgendaEntry {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  type: "ONLINE" | "OFFLINE";
  status: AppointmentStatus;
  scheduledAtUTC: string;
  durationMinutes: number;
  priceEGP: number;
  zoomMeetingUrl: string | null;
  hasClinicalRecord: boolean;
  clinicalRecordSigned: boolean;
  /** Reminder message pre-filled for this specific session. */
  whatsappReminderUrl: string;
}

/** Upcoming and recent sessions for the signed-in doctor. */
export async function getMyAgendaAction(input?: {
  fromUTC?: string;
  days?: number;
}): Promise<ActionResult<DoctorAgendaEntry[]>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"]);
  if (!guard.ok) return guard;

  const profile = await resolveDoctorProfile(guard.data.user.id);
  if (!profile.ok) return profile;

  const from = input?.fromUTC ? new Date(input.fromUTC) : new Date(Date.now() - 7 * 24 * 60 * MINUTE_MS);
  if (Number.isNaN(from.getTime())) {
    return failure("VALIDATION_ERROR", "تاريخ غير صالح.", "Invalid date.");
  }
  const days = Math.min(Math.max(input?.days ?? 30, 1), 90);
  const until = new Date(from.getTime() + days * 24 * 60 * MINUTE_MS);

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: profile.data.doctorId,
      scheduledAtUTC: { gte: from, lt: until },
      status: { in: ["CONFIRMED", "COMPLETED", "PAYMENT_UNDER_REVIEW"] },
    },
    orderBy: { scheduledAtUTC: "asc" },
    select: {
      id: true,
      type: true,
      status: true,
      scheduledAtUTC: true,
      durationMinutes: true,
      priceEGP: true,
      zoomMeetingUrl: true,
      zoomPasscode: true,
      patient: { select: { id: true, fullName: true, phone: true } },
      clinicalRecord: { select: { id: true, signedAt: true } },
    },
  });

  const clinic = getClinicConfig();

  return success(
    appointments.map((appointment) => ({
      appointmentId: appointment.id,
      patientId: appointment.patient.id,
      patientName: appointment.patient.fullName,
      patientPhone: appointment.patient.phone,
      type: asAppointmentType(appointment.type),
      status: asAppointmentStatus(appointment.status),
      scheduledAtUTC: appointment.scheduledAtUTC.toISOString(),
      durationMinutes: appointment.durationMinutes,
      priceEGP: toEgp(appointment.priceEGP),
      zoomMeetingUrl: appointment.zoomMeetingUrl,
      hasClinicalRecord: Boolean(appointment.clinicalRecord),
      clinicalRecordSigned: Boolean(appointment.clinicalRecord?.signedAt),
      whatsappReminderUrl: sessionReminderLink({
        patientName: appointment.patient.fullName,
        patientPhone: appointment.patient.phone,
        doctorName: profile.data.fullName,
        type: asAppointmentType(appointment.type),
        scheduledAtUTC: appointment.scheduledAtUTC,
        durationMinutes: appointment.durationMinutes,
        priceEGP: toEgp(appointment.priceEGP),
        zoomMeetingUrl: appointment.zoomMeetingUrl,
        zoomPasscode: appointment.zoomPasscode,
        roomNumber: profile.data.roomNumber,
        clinicAddressAr: clinic.addressAr,
        clinicMapsUrl: clinic.mapsUrl,
      }),
    })),
  );
}

// ---------------------------------------------------------------------------
// Availability rules
// ---------------------------------------------------------------------------

export interface AvailabilityRuleView {
  id: string;
  dayOfWeek: number;
  startMinutesUTC: number;
  endMinutesUTC: number;
  slotDurationMins: number;
  isOnlineAvailable: boolean;
  isOfflineAvailable: boolean;
  isActive: boolean;
}

export async function getMyAvailabilityAction(): Promise<ActionResult<AvailabilityRuleView[]>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"]);
  if (!guard.ok) return guard;

  const profile = await resolveDoctorProfile(guard.data.user.id);
  if (!profile.ok) return profile;

  const rules = await prisma.doctorAvailability.findMany({
    where: { doctorId: profile.data.doctorId },
    orderBy: [{ dayOfWeek: "asc" }, { startMinutesUTC: "asc" }],
    select: {
      id: true,
      dayOfWeek: true,
      startMinutesUTC: true,
      endMinutesUTC: true,
      slotDurationMins: true,
      isOnlineAvailable: true,
      isOfflineAvailable: true,
      isActive: true,
    },
  });

  return success(rules);
}

/**
 * Add a weekly working window. Times are UTC minutes-from-midnight; the agenda
 * UI converts from the Cairo clock the doctor actually thinks in.
 */
export async function addAvailabilityRuleAction(
  _prevState: ActionResult<AvailabilityRuleView> | null,
  formData: FormData,
): Promise<ActionResult<AvailabilityRuleView>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const profile = await resolveDoctorProfile(guard.data.user.id);
  if (!profile.ok) return profile;

  const parsed = availabilityRuleSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startMinutesUTC: formData.get("startMinutesUTC"),
    endMinutesUTC: formData.get("endMinutesUTC"),
    slotDurationMins: formData.get("slotDurationMins"),
    isOnlineAvailable: formData.get("isOnlineAvailable") === "on" || formData.get("isOnlineAvailable") === "true",
    isOfflineAvailable:
      formData.get("isOfflineAvailable") === "on" || formData.get("isOfflineAvailable") === "true",
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات نافذة العمل غير صالحة.",
      "Invalid availability window.",
      toFieldErrors(parsed.error),
    );
  }

  const rule = parsed.data;

  // Overlapping windows on the same day would emit duplicate or misaligned
  // slots, so they are rejected rather than silently merged.
  const overlapping = await prisma.doctorAvailability.findFirst({
    where: {
      doctorId: profile.data.doctorId,
      dayOfWeek: rule.dayOfWeek,
      isActive: true,
      startMinutesUTC: { lt: rule.endMinutesUTC },
      endMinutesUTC: { gt: rule.startMinutesUTC },
    },
    select: { id: true },
  });

  if (overlapping) {
    return failure(
      "CONFLICT",
      "تتداخل هذه النافذة الزمنية مع نافذة عمل قائمة في نفس اليوم.",
      "This window overlaps an existing one on the same day.",
      { startMinutesUTC: "تتداخل مع نافذة قائمة" },
    );
  }

  try {
    const created = await prisma.doctorAvailability.create({
      data: { doctorId: profile.data.doctorId, ...rule },
      select: {
        id: true,
        dayOfWeek: true,
        startMinutesUTC: true,
        endMinutesUTC: true,
        slotDurationMins: true,
        isOnlineAvailable: true,
        isOfflineAvailable: true,
        isActive: true,
      },
    });

    await recordAudit({
      actorId: guard.data.user.id,
      action: "AVAILABILITY_UPDATED",
      entityType: "DoctorAvailability",
      entityId: created.id,
      metadata: { operation: "create", dayOfWeek: rule.dayOfWeek },
    });

    revalidatePath("/dashboard/doctor");
    return success(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure(
        "CONFLICT",
        "هذه النافذة الزمنية مسجلة بالفعل.",
        "This availability window already exists.",
      );
    }
    console.error("[doctor] failed to add availability", error);
    return Failures.internal();
  }
}

/**
 * Retire a working window. Deactivated rather than deleted when appointments
 * already reference the window, so historical bookings keep their context.
 */
export async function removeAvailabilityRuleAction(
  _prevState: ActionResult<{ availabilityId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ availabilityId: string }>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const profile = await resolveDoctorProfile(guard.data.user.id);
  if (!profile.ok) return profile;

  const parsed = deleteAvailabilitySchema.safeParse({
    availabilityId: formData.get("availabilityId"),
  });
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "معرّف غير صالح.", "Invalid identifier.");
  }

  // Scoped by doctorId: an id belonging to another doctor simply matches nothing.
  const deactivated = await prisma.doctorAvailability.updateMany({
    where: { id: parsed.data.availabilityId, doctorId: profile.data.doctorId },
    data: { isActive: false, effectiveUntil: new Date() },
  });

  if (deactivated.count === 0) return Failures.notFound("نافذة العمل");

  await recordAudit({
    actorId: guard.data.user.id,
    action: "AVAILABILITY_UPDATED",
    entityType: "DoctorAvailability",
    entityId: parsed.data.availabilityId,
    metadata: { operation: "deactivate" },
  });

  revalidatePath("/dashboard/doctor");
  return success({ availabilityId: parsed.data.availabilityId });
}

/** Block a concrete interval (leave, travel, clinic closure). */
export async function addTimeOffAction(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const profile = await resolveDoctorProfile(guard.data.user.id);
  if (!profile.ok) return profile;

  const parsed = timeOffSchema.safeParse({
    startsAtUTC: formData.get("startsAtUTC"),
    endsAtUTC: formData.get("endsAtUTC"),
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات فترة الإجازة غير صالحة.",
      "Invalid time-off period.",
      toFieldErrors(parsed.error),
    );
  }

  const { startsAtUTC, endsAtUTC, reason } = parsed.data;

  // Blocking time the clinic has already sold would strand confirmed patients.
  const clash = await prisma.appointment.findFirst({
    where: {
      doctorId: profile.data.doctorId,
      status: { in: ["CONFIRMED", "PAYMENT_UNDER_REVIEW", "PENDING_PAYMENT_PROOF"] },
      scheduledAtUTC: { gte: startsAtUTC, lt: endsAtUTC },
    },
    select: { id: true, scheduledAtUTC: true },
  });

  if (clash) {
    return failure(
      "CONFLICT",
      "توجد مواعيد محجوزة داخل هذه الفترة. يرجى إلغاؤها أو إعادة جدولتها أولاً.",
      "There are booked appointments inside this period. Cancel or reschedule them first.",
    );
  }

  const created = await prisma.availabilityException.create({
    data: { doctorId: profile.data.doctorId, startsAtUTC, endsAtUTC, reason },
    select: { id: true },
  });

  revalidatePath("/dashboard/doctor");
  return success(created);
}

// ---------------------------------------------------------------------------
// Clinical documentation
// ---------------------------------------------------------------------------

export interface ClinicalRecordView {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  chiefComplaint: string | null;
  diagnosis: string;
  dsm5Codes: string[];
  prescriptionNotes: string | null;
  followUpPlan: string | null;
  riskLevel: string | null;
  signedAtUTC: string | null;
  createdAtUTC: string;
}

/**
 * Create or update the session note.
 *
 * Signing is one-way: once `signedAt` is set the record is the clinic's legal
 * documentation of that session and further edits are refused. An amendment is
 * made as a new record against a follow-up session, which is how paper charts
 * work and what an audit expects to see.
 */
export async function saveClinicalRecordAction(
  _prevState: ActionResult<ClinicalRecordView> | null,
  formData: FormData,
): Promise<ActionResult<ClinicalRecordView>> {
  const guard = await requireRole(["DOCTOR"], formData);
  if (!guard.ok) return guard;

  const profile = await resolveDoctorProfile(guard.data.user.id);
  if (!profile.ok) return profile;

  const parsed = clinicalRecordSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    chiefComplaint: formData.get("chiefComplaint") ?? "",
    diagnosis: formData.get("diagnosis"),
    dsm5Codes: formData.get("dsm5Codes") ?? "",
    prescriptionNotes: formData.get("prescriptionNotes") ?? "",
    followUpPlan: formData.get("followUpPlan") ?? "",
    riskLevel: formData.get("riskLevel") || undefined,
    sign: formData.get("sign") === "on" || formData.get("sign") === "true",
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى مراجعة بيانات التقرير الإكلينيكي.",
      "Please review the clinical note.",
      toFieldErrors(parsed.error),
    );
  }

  const input = parsed.data;

  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: {
      id: true,
      doctorId: true,
      patientId: true,
      status: true,
      scheduledAtUTC: true,
      patient: { select: { fullName: true } },
      clinicalRecord: { select: { id: true, signedAt: true } },
    },
  });

  if (!appointment) return Failures.notFound("الحجز المطلوب");
  if (appointment.doctorId !== profile.data.doctorId) return Failures.forbidden();

  if (!["CONFIRMED", "COMPLETED"].includes(appointment.status)) {
    return failure(
      "INVALID_STATE",
      "لا يمكن كتابة تقرير إكلينيكي لجلسة غير مؤكدة.",
      "A clinical note can only be written for a confirmed session.",
    );
  }

  if (appointment.clinicalRecord?.signedAt) {
    return failure(
      "INVALID_STATE",
      "هذا التقرير موقّع ولا يمكن تعديله. يمكنك إضافة تقرير جديد في جلسة المتابعة.",
      "This record is signed and can no longer be edited.",
    );
  }

  const data = {
    chiefComplaint: input.chiefComplaint,
    diagnosis: input.diagnosis,
    // Stored as a JSON string so the column is portable to SQL Server, which
    // has no array type. Read back through toStringArray().
    dsm5CodesJson: fromStringArray(input.dsm5Codes),
    prescriptionNotes: input.prescriptionNotes,
    followUpPlan: input.followUpPlan,
    riskLevel: input.riskLevel,
    signedAt: input.sign ? new Date() : null,
  };

  const record = await prisma.clinicalRecord.upsert({
    where: { appointmentId: appointment.id },
    create: {
      appointmentId: appointment.id,
      doctorId: profile.data.doctorId,
      patientId: appointment.patientId,
      ...data,
    },
    update: data,
    select: {
      id: true,
      appointmentId: true,
      patientId: true,
      chiefComplaint: true,
      diagnosis: true,
      dsm5CodesJson: true,
      prescriptionNotes: true,
      followUpPlan: true,
      riskLevel: true,
      signedAt: true,
      createdAt: true,
    },
  });

  await recordAudit({
    actorId: guard.data.user.id,
    action: "CLINICAL_RECORD_SAVED",
    entityType: "ClinicalRecord",
    entityId: record.id,
    metadata: { appointmentId: appointment.id, signed: Boolean(record.signedAt) },
  });

  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/patient");

  return success({
    id: record.id,
    appointmentId: record.appointmentId,
    patientId: record.patientId,
    patientName: appointment.patient.fullName,
    chiefComplaint: record.chiefComplaint,
    diagnosis: record.diagnosis,
    dsm5Codes: toStringArray(record.dsm5CodesJson),
    prescriptionNotes: record.prescriptionNotes,
    followUpPlan: record.followUpPlan,
    riskLevel: record.riskLevel,
    signedAtUTC: record.signedAt?.toISOString() ?? null,
    createdAtUTC: record.createdAt.toISOString(),
  });
}

/** Mark a session as delivered, which is what closes it out for reporting. */
export async function completeAppointmentAction(
  _prevState: ActionResult<{ appointmentId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ appointmentId: string }>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const profile = await resolveDoctorProfile(guard.data.user.id);
  if (!profile.ok) return profile;

  const parsed = completeAppointmentSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
  });
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "معرّف الحجز غير صالح.", "Invalid appointment id.");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    select: { id: true, doctorId: true, status: true, scheduledAtUTC: true },
  });

  if (!appointment) return Failures.notFound("الحجز المطلوب");
  if (appointment.doctorId !== profile.data.doctorId && guard.data.user.role !== "ADMIN") {
    return Failures.forbidden();
  }
  if (appointment.status !== "CONFIRMED") {
    return failure(
      "INVALID_STATE",
      "لا يمكن إنهاء جلسة غير مؤكدة.",
      "Only a confirmed session can be completed.",
    );
  }
  if (appointment.scheduledAtUTC.getTime() > Date.now()) {
    return failure(
      "INVALID_STATE",
      "لا يمكن إنهاء جلسة لم يحن موعدها بعد.",
      "A session cannot be completed before its scheduled time.",
    );
  }

  const updated = await prisma.appointment.updateMany({
    where: { id: appointment.id, status: "CONFIRMED" },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  if (updated.count === 0) {
    return failure(
      "CONFLICT",
      "تم تحديث حالة الجلسة بالفعل.",
      "This session was already updated.",
    );
  }

  await recordAudit({
    actorId: guard.data.user.id,
    action: "APPOINTMENT_COMPLETED",
    entityType: "Appointment",
    entityId: appointment.id,
  });

  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/patient");

  return success({ appointmentId: appointment.id });
}

/**
 * A patient's history, restricted to records this doctor authored.
 * Cross-doctor access to a chart is a policy decision the clinic has not made,
 * so the safe default is applied here and the access is audited.
 */
export async function getPatientHistoryAction(
  patientId: string,
): Promise<ActionResult<ClinicalRecordView[]>> {
  const guard = await requireRole(["DOCTOR"]);
  if (!guard.ok) return guard;

  const profile = await resolveDoctorProfile(guard.data.user.id);
  if (!profile.ok) return profile;

  const records = await prisma.clinicalRecord.findMany({
    where: { patientId, doctorId: profile.data.doctorId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      appointmentId: true,
      patientId: true,
      chiefComplaint: true,
      diagnosis: true,
      dsm5CodesJson: true,
      prescriptionNotes: true,
      followUpPlan: true,
      riskLevel: true,
      signedAt: true,
      createdAt: true,
      patient: { select: { fullName: true } },
    },
  });

  if (records.length > 0) {
    await recordAudit({
      actorId: guard.data.user.id,
      action: "CLINICAL_RECORD_VIEWED",
      entityType: "ClinicalRecord",
      entityId: patientId,
      metadata: { count: records.length },
    });
  }

  return success(
    records.map((record) => ({
      id: record.id,
      appointmentId: record.appointmentId,
      patientId: record.patientId,
      patientName: record.patient.fullName,
      chiefComplaint: record.chiefComplaint,
      diagnosis: record.diagnosis,
      dsm5Codes: toStringArray(record.dsm5CodesJson),
      prescriptionNotes: record.prescriptionNotes,
      followUpPlan: record.followUpPlan,
      riskLevel: record.riskLevel,
      signedAtUTC: record.signedAt?.toISOString() ?? null,
      createdAtUTC: record.createdAt.toISOString(),
    })),
  );
}
