"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  asAppointmentStatus,
  asAppointmentType,
  OCCUPYING_STATUSES,
  type AppointmentStatus,
} from "@/lib/domain/enums";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import {
  availabilityRuleSchema,
  availabilityRuleUpdateSchema,
  cancelByDoctorSchema,
  clinicalRecordSchema,
  completeAppointmentSchema,
  deleteAvailabilitySchema,
  forceTimeOffSchema,
  rescheduleAppointmentSchema,
  releaseReservationSchema,
  timeOffCancelSchema,
  timeOffSchema,
  toFieldErrors,
} from "@/lib/validation/schemas";
import { requireRole, type AuthContext } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/security/audit";
import { fromStringArray, toEgp, toStringArray } from "@/lib/serialization";
import { bookingPolicy, getClinicConfig } from "@/lib/clinic-config";
import {
  appointmentRescheduledLink,
  clinicCancellationLink,
  formatCairo,
  sessionReminderLink,
} from "@/lib/whatsapp";
import { ACTIVE_RULE_LOCK, ACTIVE_SLOT_LOCK } from "@/lib/constants";
import { generateSlots, intervalsOverlap, isSlotOffered, parseUtcDate, startOfUtcDay } from "@/lib/slots";

const MINUTE_MS = 60_000;

/**
 * Resolve the DoctorProfile an action should operate on.
 *
 * A DOCTOR may only ever target their own profile — the requested doctorId is
 * ignored for them rather than trusted, so a crafted POST cannot redirect a
 * write onto a colleague's calendar. An ADMIN must name the target explicitly;
 * there is no implicit "current doctor" for an admin.
 */
export async function resolveTargetDoctor(
  auth: AuthContext,
  requestedDoctorId?: string | null,
): Promise<ActionResult<{ doctorId: string; fullName: string; roomNumber: string | null }>> {
  if (auth.user.role === "DOCTOR") {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: auth.user.id },
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

  if (auth.user.role === "ADMIN") {
    if (!requestedDoctorId) {
      return failure(
        "VALIDATION_ERROR",
        "يجب تحديد الطبيب المستهدف.",
        "A target doctor must be specified.",
      );
    }

    const profile = await prisma.doctorProfile.findUnique({
      where: { id: requestedDoctorId },
      select: { id: true, roomNumber: true, user: { select: { fullName: true } } },
    });

    if (!profile) {
      return Failures.notFound("الطبيب المطلوب");
    }

    return success({
      doctorId: profile.id,
      fullName: profile.user.fullName,
      roomNumber: profile.roomNumber,
    });
  }

  return Failures.forbidden();
}

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
  doctorId: string;
  doctorName: string;
  type: "ONLINE" | "OFFLINE";
  status: AppointmentStatus;
  scheduledAtUTC: string;
  durationMinutes: number;
  priceEGP: number;
  zoomMeetingUrl: string | null;
  hasClinicalRecord: boolean;
  clinicalRecordSigned: boolean;
  rescheduledFromUTC: string | null;
  rescheduleReason: string | null;
  whatsappReminderUrl: string;
}

/** Upcoming and recent sessions for a doctor. */
export async function getMyAgendaAction(input?: {
  doctorId?: string;
  fromUTC?: string;
  days?: number;
}): Promise<ActionResult<DoctorAgendaEntry[]>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"]);
  if (!guard.ok) return guard;

  const target = await resolveTargetDoctor(guard.data, input?.doctorId);
  if (!target.ok) return target;

  const from = input?.fromUTC ? new Date(input.fromUTC) : new Date(Date.now() - 7 * 24 * 60 * MINUTE_MS);
  if (Number.isNaN(from.getTime())) {
    return failure("VALIDATION_ERROR", "تاريخ غير صالح.", "Invalid date.");
  }
  const days = Math.min(Math.max(input?.days ?? 30, 1), 90);
  const until = new Date(from.getTime() + days * 24 * 60 * MINUTE_MS);

  const clinic = getClinicConfig();
  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: target.data.doctorId,
      scheduledAtUTC: { gte: from, lte: until },
    },
    orderBy: { scheduledAtUTC: "asc" },
    include: {
      patient: { select: { id: true, fullName: true, phone: true } },
      doctor: { select: { user: { select: { fullName: true } } } },
      clinicalRecord: { select: { id: true, signedAt: true } },
    },
  });

  return success(
    appointments.map((appointment) => ({
      appointmentId: appointment.id,
      patientId: appointment.patient.id,
      patientName: appointment.patient.fullName,
      patientPhone: appointment.patient.phone,
      doctorId: target.data.doctorId,
      doctorName: appointment.doctor.user.fullName,
      type: asAppointmentType(appointment.type),
      status: asAppointmentStatus(appointment.status),
      scheduledAtUTC: appointment.scheduledAtUTC.toISOString(),
      durationMinutes: appointment.durationMinutes,
      priceEGP: toEgp(appointment.priceEGP),
      zoomMeetingUrl: appointment.zoomMeetingUrl,
      hasClinicalRecord: Boolean(appointment.clinicalRecord),
      clinicalRecordSigned: Boolean(appointment.clinicalRecord?.signedAt),
      rescheduledFromUTC: appointment.rescheduledFromUTC?.toISOString() ?? null,
      rescheduleReason: appointment.rescheduleReason ?? null,
      whatsappReminderUrl: sessionReminderLink({
        patientName: appointment.patient.fullName,
        patientPhone: appointment.patient.phone,
        doctorName: appointment.doctor.user.fullName,
        type: asAppointmentType(appointment.type),
        scheduledAtUTC: appointment.scheduledAtUTC,
        durationMinutes: appointment.durationMinutes,
        priceEGP: toEgp(appointment.priceEGP),
        zoomMeetingUrl: appointment.zoomMeetingUrl,
        zoomPasscode: appointment.zoomPasscode,
        roomNumber: target.data.roomNumber,
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
  doctorId: string;
  dayOfWeek: number;
  startMinutesUTC: number;
  endMinutesUTC: number;
  slotDurationMins: number;
  isOnlineAvailable: boolean;
  isOfflineAvailable: boolean;
  isActive: boolean;
}

export async function getMyAvailabilityAction(
  doctorId?: string,
): Promise<ActionResult<AvailabilityRuleView[]>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"]);
  if (!guard.ok) return guard;

  const target = await resolveTargetDoctor(guard.data, doctorId);
  if (!target.ok) return target;

  const rules = await prisma.doctorAvailability.findMany({
    where: { doctorId: target.data.doctorId, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startMinutesUTC: "asc" }],
    select: {
      id: true,
      doctorId: true,
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

/** Add a weekly working window. */
export async function addAvailabilityRuleAction(
  _prevState: ActionResult<AvailabilityRuleView> | null,
  formData: FormData,
): Promise<ActionResult<AvailabilityRuleView>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const target = await resolveTargetDoctor(guard.data, formData.get("doctorId") as string);
  if (!target.ok) return target;

  const parsed = availabilityRuleSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startMinutesUTC: formData.get("startMinutesUTC"),
    endMinutesUTC: formData.get("endMinutesUTC"),
    slotDurationMins: formData.get("slotDurationMins"),
    isOnlineAvailable: formData.get("isOnlineAvailable") === "on" || formData.get("isOnlineAvailable") === "true",
    isOfflineAvailable: formData.get("isOfflineAvailable") === "on" || formData.get("isOfflineAvailable") === "true",
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

  const overlapping = await prisma.doctorAvailability.findFirst({
    where: {
      doctorId: target.data.doctorId,
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
      data: {
        doctorId: target.data.doctorId,
        ruleLockKey: ACTIVE_RULE_LOCK,
        ...rule,
      },
      select: {
        id: true,
        doctorId: true,
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
      metadata: { operation: "create", dayOfWeek: rule.dayOfWeek, doctorId: target.data.doctorId },
    });

    revalidatePath("/dashboard/doctor");
    revalidatePath("/dashboard/admin");
    revalidatePath(`/booking/${target.data.doctorId}`);
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

/** Update an existing availability window. */
export async function updateAvailabilityRuleAction(
  _prevState: ActionResult<AvailabilityRuleView> | null,
  formData: FormData,
): Promise<ActionResult<AvailabilityRuleView>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const target = await resolveTargetDoctor(guard.data, formData.get("doctorId") as string);
  if (!target.ok) return target;

  const parsed = availabilityRuleUpdateSchema.safeParse({
    availabilityId: formData.get("availabilityId"),
    doctorId: formData.get("doctorId") || undefined,
    dayOfWeek: formData.get("dayOfWeek"),
    startMinutesUTC: formData.get("startMinutesUTC"),
    endMinutesUTC: formData.get("endMinutesUTC"),
    slotDurationMins: formData.get("slotDurationMins"),
    isOnlineAvailable: formData.get("isOnlineAvailable") === "on" || formData.get("isOnlineAvailable") === "true",
    isOfflineAvailable: formData.get("isOfflineAvailable") === "on" || formData.get("isOfflineAvailable") === "true",
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات نافذة العمل غير صالحة.",
      "Invalid availability window.",
      toFieldErrors(parsed.error),
    );
  }

  const { availabilityId, ...rule } = parsed.data;

  // Verify ownership
  const existing = await prisma.doctorAvailability.findFirst({
    where: { id: availabilityId, doctorId: target.data.doctorId },
    select: { id: true },
  });

  if (!existing) {
    return Failures.notFound("نافذة العمل");
  }

  // Check overlap against other active rules on the same day
  const overlapping = await prisma.doctorAvailability.findFirst({
    where: {
      doctorId: target.data.doctorId,
      dayOfWeek: rule.dayOfWeek,
      isActive: true,
      id: { not: availabilityId },
      startMinutesUTC: { lt: rule.endMinutesUTC },
      endMinutesUTC: { gt: rule.startMinutesUTC },
    },
    select: { id: true },
  });

  if (overlapping) {
    return failure(
      "CONFLICT",
      "تتداخل هذه النافذة الزمنية مع نافذة عمل أخرى قائمة في نفس اليوم.",
      "This window overlaps another active window on the same day.",
      { startMinutesUTC: "تتداخل مع نافذة قائمة" },
    );
  }

  try {
    const updated = await prisma.doctorAvailability.update({
      where: { id: availabilityId },
      data: {
        dayOfWeek: rule.dayOfWeek,
        startMinutesUTC: rule.startMinutesUTC,
        endMinutesUTC: rule.endMinutesUTC,
        slotDurationMins: rule.slotDurationMins,
        isOnlineAvailable: rule.isOnlineAvailable,
        isOfflineAvailable: rule.isOfflineAvailable,
      },
      select: {
        id: true,
        doctorId: true,
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
      action: "AVAILABILITY_RULE_EDITED",
      entityType: "DoctorAvailability",
      entityId: updated.id,
      metadata: { byRole: guard.data.user.role, doctorId: target.data.doctorId, dayOfWeek: rule.dayOfWeek },
    });

    revalidatePath("/dashboard/doctor");
    revalidatePath("/dashboard/admin");
    revalidatePath(`/booking/${target.data.doctorId}`);
    return success(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure(
        "CONFLICT",
        "هذه النافذة الزمنية مسجلة بالفعل.",
        "This availability window already exists.",
      );
    }
    console.error("[doctor] failed to update availability", error);
    return Failures.internal();
  }
}

/**
 * Retire a working window.
 * Rewrites ruleLockKey to row id to free the unique constraint tuple (G2 fix).
 */
export async function retireAvailabilityRuleAction(
  _prevState: ActionResult<{ availabilityId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ availabilityId: string }>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const target = await resolveTargetDoctor(guard.data, formData.get("doctorId") as string);
  if (!target.ok) return target;

  const parsed = deleteAvailabilitySchema.safeParse({
    availabilityId: formData.get("availabilityId"),
    doctorId: formData.get("doctorId") || undefined,
  });
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "معرّف غير صالح.", "Invalid identifier.");
  }

  const rule = await prisma.doctorAvailability.findFirst({
    where: { id: parsed.data.availabilityId, doctorId: target.data.doctorId },
    select: { id: true },
  });

  if (!rule) return Failures.notFound("نافذة العمل");

  await prisma.doctorAvailability.update({
    where: { id: rule.id },
    data: {
      isActive: false,
      ruleLockKey: rule.id, // Frees the composite unique index for future identical rules
      effectiveUntil: new Date(),
    },
  });

  await recordAudit({
    actorId: guard.data.user.id,
    action: "AVAILABILITY_RULE_RETIRED",
    entityType: "DoctorAvailability",
    entityId: rule.id,
    metadata: { byRole: guard.data.user.role, doctorId: target.data.doctorId },
  });

  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/admin");
  revalidatePath(`/booking/${target.data.doctorId}`);
  return success({ availabilityId: rule.id });
}

export const removeAvailabilityRuleAction = retireAvailabilityRuleAction;

export interface AffectedAppointment {
  id: string;
  patientName: string;
  patientPhone: string;
  scheduledAtUTC: string;
  status: AppointmentStatus;
}

/** Pre-flight check: preview existing appointments affected by a schedule edit/retirement. */
export async function getAvailabilityImpactAction(input: {
  doctorId?: string;
  availabilityId?: string;
  dayOfWeek: number;
  startMinutesUTC: number;
  endMinutesUTC: number;
}): Promise<ActionResult<{ affectedAppointments: AffectedAppointment[]; horizonDays: number }>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"]);
  if (!guard.ok) return guard;

  const target = await resolveTargetDoctor(guard.data, input.doctorId);
  if (!target.ok) return target;

  const horizonDays = bookingPolicy.horizonDays;
  const now = new Date();
  const windowEnd = new Date(now.getTime() + horizonDays * 24 * 60 * MINUTE_MS);

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: target.data.doctorId,
      status: { in: [...OCCUPYING_STATUSES] },
      scheduledAtUTC: { gte: now, lte: windowEnd },
    },
    include: {
      patient: { select: { fullName: true, phone: true } },
    },
    orderBy: { scheduledAtUTC: "asc" },
  });

  // Filter appointments that fall on the specified dayOfWeek but outside the new window
  const affected = appointments.filter((app) => {
    const day = app.scheduledAtUTC.getUTCDay();
    if (day !== input.dayOfWeek) return false;
    const minutes = app.scheduledAtUTC.getUTCHours() * 60 + app.scheduledAtUTC.getUTCMinutes();
    const isInsideNew = minutes >= input.startMinutesUTC && minutes < input.endMinutesUTC;
    return !isInsideNew;
  });

  return success({
    affectedAppointments: affected.map((a) => ({
      id: a.id,
      patientName: a.patient.fullName,
      patientPhone: a.patient.phone,
      scheduledAtUTC: a.scheduledAtUTC.toISOString(),
      status: asAppointmentStatus(a.status),
    })),
    horizonDays,
  });
}

// ---------------------------------------------------------------------------
// Time-off Management (AvailabilityException)
// ---------------------------------------------------------------------------

export interface TimeOffView {
  id: string;
  doctorId: string;
  startsAtUTC: string;
  endsAtUTC: string;
  reason: string | null;
  createdAtUTC: string;
}

export async function getTimeOffAction(
  doctorId?: string,
  includePast = false,
): Promise<ActionResult<TimeOffView[]>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"]);
  if (!guard.ok) return guard;

  const target = await resolveTargetDoctor(guard.data, doctorId);
  if (!target.ok) return target;

  const now = new Date();
  const exceptions = await prisma.availabilityException.findMany({
    where: {
      doctorId: target.data.doctorId,
      cancelledAt: null,
      ...(includePast ? {} : { endsAtUTC: { gte: now } }),
    },
    orderBy: { startsAtUTC: "asc" },
    select: {
      id: true,
      doctorId: true,
      startsAtUTC: true,
      endsAtUTC: true,
      reason: true,
      createdAt: true,
    },
  });

  return success(
    exceptions.map((e) => ({
      id: e.id,
      doctorId: e.doctorId,
      startsAtUTC: e.startsAtUTC.toISOString(),
      endsAtUTC: e.endsAtUTC.toISOString(),
      reason: e.reason,
      createdAtUTC: e.createdAt.toISOString(),
    })),
  );
}

/** Add vacation / time-off interval. */
export async function addTimeOffAction(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const target = await resolveTargetDoctor(guard.data, formData.get("doctorId") as string);
  if (!target.ok) return target;

  const parsed = timeOffSchema.safeParse({
    doctorId: formData.get("doctorId") || undefined,
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

  // Check for clashes
  const clash = await prisma.appointment.findFirst({
    where: {
      doctorId: target.data.doctorId,
      status: { in: [...OCCUPYING_STATUSES] },
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
    data: {
      doctorId: target.data.doctorId,
      createdById: guard.data.user.id,
      startsAtUTC,
      endsAtUTC,
      reason,
    },
    select: { id: true },
  });

  await recordAudit({
    actorId: guard.data.user.id,
    action: "TIME_OFF_ADDED",
    entityType: "AvailabilityException",
    entityId: created.id,
    metadata: { doctorId: target.data.doctorId, startsAtUTC: startsAtUTC.toISOString(), endsAtUTC: endsAtUTC.toISOString() },
  });

  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/admin");
  revalidatePath(`/booking/${target.data.doctorId}`);
  return success(created);
}

/** Cancel / soft-delete a time-off exception. */
export async function cancelTimeOffAction(
  _prevState: ActionResult<{ exceptionId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ exceptionId: string }>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const target = await resolveTargetDoctor(guard.data, formData.get("doctorId") as string);
  if (!target.ok) return target;

  const parsed = timeOffCancelSchema.safeParse({
    exceptionId: formData.get("exceptionId"),
    doctorId: formData.get("doctorId") || undefined,
  });

  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "معرّف غير صالح.", "Invalid identifier.");
  }

  const updated = await prisma.availabilityException.updateMany({
    where: {
      id: parsed.data.exceptionId,
      doctorId: target.data.doctorId,
      cancelledAt: null,
    },
    data: { cancelledAt: new Date() },
  });

  if (updated.count === 0) return Failures.notFound("فترة الإجازة");

  await recordAudit({
    actorId: guard.data.user.id,
    action: "TIME_OFF_CANCELLED",
    entityType: "AvailabilityException",
    entityId: parsed.data.exceptionId,
    metadata: { doctorId: target.data.doctorId },
  });

  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/admin");
  revalidatePath(`/booking/${target.data.doctorId}`);
  return success({ exceptionId: parsed.data.exceptionId });
}

export interface ForceTimeOffResult {
  exceptionId: string;
  cancelledAppointments: Array<{
    appointmentId: string;
    patientName: string;
    patientPhone: string;
    scheduledAtUTC: string;
    whatsappCancelUrl: string;
  }>;
}

/** Admin escalation: force time-off and cancel conflicting appointments in transaction. */
export async function forceTimeOffAction(
  _prevState: ActionResult<ForceTimeOffResult> | null,
  formData: FormData,
): Promise<ActionResult<ForceTimeOffResult>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = forceTimeOffSchema.safeParse({
    doctorId: formData.get("doctorId"),
    startsAtUTC: formData.get("startsAtUTC"),
    endsAtUTC: formData.get("endsAtUTC"),
    reason: formData.get("reason") ?? "",
    cancelConflicts: formData.get("cancelConflicts") === "true",
    cancellationReason: formData.get("cancellationReason"),
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات الطلب غير صالحة.",
      "Invalid request parameters.",
      toFieldErrors(parsed.error),
    );
  }

  const { doctorId, startsAtUTC, endsAtUTC, reason, cancellationReason } = parsed.data;

  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    select: { id: true, roomNumber: true, user: { select: { fullName: true } } },
  });
  if (!doctor) return Failures.notFound("الطبيب المطلوب");

  const conflicting = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: { in: [...OCCUPYING_STATUSES] },
      scheduledAtUTC: { gte: startsAtUTC, lt: endsAtUTC },
    },
    include: {
      patient: { select: { fullName: true, phone: true } },
    },
  });

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const exception = await tx.availabilityException.create({
      data: {
        doctorId,
        createdById: guard.data.user.id,
        startsAtUTC,
        endsAtUTC,
        reason,
      },
    });

    for (const app of conflicting) {
      await tx.appointment.update({
        where: { id: app.id },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancellationReason,
          slotLockKey: app.id, // Frees the composite slot lock
          holdExpiresAt: null,
        },
      });

      await tx.paymentProof.updateMany({
        where: { appointmentId: app.id, status: "UNDER_REVIEW" },
        data: {
          status: "REJECTED",
          reviewedAt: now,
          reviewedById: guard.data.user.id,
          rejectionReason: `تم إلغاء الموعد بسبب إجازة طارئة للعيادة: ${cancellationReason}`,
        },
      });

      // Auto-issue patient credit for confirmed appointments cancelled by emergency time-off
      if (app.status === "CONFIRMED") {
        await tx.patientCredit.create({
          data: {
            patientId: app.patientId,
            appointmentId: app.id,
            amountEGP: app.priceEGP,
            kind: "CANCELLATION",
            reason: `إلغاء جلسة بسبب إجازة طارئة للعيادة: ${cancellationReason}`,
            issuedById: guard.data.user.id,
          },
        });
      }
    }

    return exception;
  });

  await recordAudit({
    actorId: guard.data.user.id,
    action: "TIME_OFF_ADDED",
    entityType: "AvailabilityException",
    entityId: result.id,
    metadata: {
      forcedByAdmin: true,
      doctorId,
      cancelledCount: conflicting.length,
    },
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/credits");
  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/patient");
  revalidatePath(`/booking/${doctorId}`);

  return success({
    exceptionId: result.id,
    cancelledAppointments: conflicting.map((c) => ({
      appointmentId: c.id,
      patientName: c.patient.fullName,
      patientPhone: c.patient.phone,
      scheduledAtUTC: c.scheduledAtUTC.toISOString(),
      whatsappCancelUrl: clinicCancellationLink({
        patientName: c.patient.fullName,
        patientPhone: c.patient.phone,
        doctorName: doctor.user.fullName,
        scheduledAtUTC: c.scheduledAtUTC,
        roomNumber: doctor.roomNumber ?? null,
        reason: cancellationReason,
      }),
    })),
  });
}

// ---------------------------------------------------------------------------
// Appointment Lifecycle (Reschedule, Doctor Cancel, Release Hold)
// ---------------------------------------------------------------------------

export interface ReschedulePayload {
  appointmentId: string;
  oldScheduledAtUTC: string;
  newScheduledAtUTC: string;
  whatsappRescheduleUrl: string;
}

/**
 * Reschedule an appointment in-place without destroying payment proofs.
 * Guarantees slot concurrency via database P2002 error catching.
 */
export async function rescheduleAppointmentAction(
  _prevState: ActionResult<ReschedulePayload> | null,
  formData: FormData,
): Promise<ActionResult<ReschedulePayload>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = rescheduleAppointmentSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    scheduledAtUTC: formData.get("scheduledAtUTC"),
    durationMinutes: formData.get("durationMinutes"),
    reason: formData.get("reason") ?? "",
    notifyPatient: formData.get("notifyPatient") !== "false",
    allowOffGrid: formData.get("allowOffGrid") === "true",
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات إعادة الجدولة غير صالحة.",
      "Invalid reschedule details.",
      toFieldErrors(parsed.error),
    );
  }

  const { appointmentId, scheduledAtUTC: targetInstant, durationMinutes, reason, allowOffGrid } = parsed.data;
  const allowOverlap = formData.get("allowOverlap") === "true";

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: { select: { id: true, userId: true, roomNumber: true, user: { select: { fullName: true } } } },
      patient: { select: { id: true, fullName: true, phone: true } },
    },
  });

  if (!appointment) return Failures.notFound("الحجز المطلوب");

  // Authorisation check: DOCTOR only owns their appointments
  if (guard.data.user.role === "DOCTOR" && appointment.doctor.userId !== guard.data.user.id) {
    return Failures.forbidden();
  }

  // Status check: only CONFIRMED and PAYMENT_UNDER_REVIEW may be rescheduled
  if (!["CONFIRMED", "PAYMENT_UNDER_REVIEW"].includes(appointment.status)) {
    return failure(
      "INVALID_STATE",
      "يمكن إعادة جدولة المواعيد المؤكدة أو التي قيد مراجعة الدفع فقط.",
      "Only confirmed or under-review appointments can be rescheduled.",
    );
  }

  const now = new Date();
  if (targetInstant.getTime() <= now.getTime()) {
    return failure(
      "VALIDATION_ERROR",
      "لا يمكن اختيار موعد في الماضي.",
      "Cannot reschedule to a past time.",
    );
  }

  const maxHorizon = new Date(now.getTime() + bookingPolicy.horizonDays * 24 * 60 * MINUTE_MS);
  if (targetInstant.getTime() > maxHorizon.getTime()) {
    return failure(
      "VALIDATION_ERROR",
      `لا يمكن حجز موعد بعد أكثر من ${bookingPolicy.horizonDays} يوماً.`,
      `Cannot book beyond ${bookingPolicy.horizonDays} days.`,
    );
  }

  // Verify that slot is published on the grid (unless admin overrides with allowOffGrid)
  if (!allowOffGrid || guard.data.user.role !== "ADMIN") {
    const doctorRules = await prisma.doctorAvailability.findMany({
      where: { doctorId: appointment.doctorId, isActive: true },
    });
    const exceptions = await prisma.availabilityException.findMany({
      where: { doctorId: appointment.doctorId, cancelledAt: null, endsAtUTC: { gte: now } },
      select: { startsAtUTC: true, endsAtUTC: true },
    });
    const busy = await prisma.appointment.findMany({
      where: {
        doctorId: appointment.doctorId,
        id: { not: appointmentId },
        status: { in: [...OCCUPYING_STATUSES] },
        scheduledAtUTC: { gte: new Date(targetInstant.getTime() - 4 * 60 * MINUTE_MS), lte: new Date(targetInstant.getTime() + 4 * 60 * MINUTE_MS) },
      },
      select: { scheduledAtUTC: true, durationMinutes: true },
    });

    const slots = generateSlots({
      rules: doctorRules,
      exceptions: exceptions.map((e) => ({ startUTC: e.startsAtUTC, endUTC: e.endsAtUTC })),
      busy: busy.map((b) => ({
        startUTC: b.scheduledAtUTC,
        endUTC: new Date(b.scheduledAtUTC.getTime() + b.durationMinutes * MINUTE_MS),
      })),
      type: asAppointmentType(appointment.type),
      from: startOfUtcDay(targetInstant),
      days: 2,
      now,
      minNoticeMinutes: bookingPolicy.minNoticeMinutes,
    });

    if (!isSlotOffered(slots, targetInstant, durationMinutes)) {
      return failure(
        "CONFLICT",
        "الموعد المختار غير متاح في جدول الطبيب.",
        "The selected slot is not offered or is already taken.",
      );
    }
  } else {
    // ADMIN Off-Grid Overlap Guard:
    // When an admin schedules off-grid, the DB unique index (@@unique([doctorId, scheduledAtUTC, slotLockKey]))
    // only detects exact-instant collisions. We explicitly check interval overlaps here.
    // RESIDUAL RACE NOTE: This is an application-level check with a small time-of-check/time-of-use window.
    // For admin-only manual adjustments, this is acceptable.
    const nearbyBusy = await prisma.appointment.findMany({
      where: {
        doctorId: appointment.doctorId,
        id: { not: appointmentId },
        status: { in: [...OCCUPYING_STATUSES] },
        scheduledAtUTC: {
          gte: new Date(targetInstant.getTime() - 4 * 60 * MINUTE_MS),
          lte: new Date(targetInstant.getTime() + 4 * 60 * MINUTE_MS),
        },
      },
      select: { scheduledAtUTC: true, durationMinutes: true },
    });

    const targetEnd = new Date(targetInstant.getTime() + durationMinutes * MINUTE_MS);
    const conflictingApp = nearbyBusy.find((b) => {
      const bEnd = new Date(b.scheduledAtUTC.getTime() + b.durationMinutes * MINUTE_MS);
      return intervalsOverlap(targetInstant, targetEnd, b.scheduledAtUTC, bEnd);
    });

    if (conflictingApp && !allowOverlap) {
      const conflictTime = formatCairo(conflictingApp.scheduledAtUTC);
      return failure(
        "CONFLICT",
        `الموعد الجديد يتداخل مع جلسة أخرى لنفس الطبيب بتوقيت القاهرة (${conflictTime}).`,
        `The new time overlaps another session for this doctor (${conflictTime}).`,
      );
    }
  }

  const oldScheduledAtUTC = appointment.scheduledAtUTC;

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        scheduledAtUTC: targetInstant,
        durationMinutes,
        rescheduledFromUTC: oldScheduledAtUTC,
        rescheduledAt: now,
        rescheduledById: guard.data.user.id,
        rescheduleReason: reason,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure(
        "SLOT_TAKEN",
        "هذا الموعد محجوز بالفعل لمريض آخر. يرجى اختيار وقت بديل.",
        "That slot is already booked for another patient.",
      );
    }
    console.error("[reschedule] Database error:", error);
    return Failures.internal();
  }

  await recordAudit({
    actorId: guard.data.user.id,
    action: "APPOINTMENT_RESCHEDULED",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: {
      fromUTC: oldScheduledAtUTC.toISOString(),
      toUTC: targetInstant.toISOString(),
      byRole: guard.data.user.role,
      offGrid: Boolean(allowOffGrid),
      overlapForced: Boolean(allowOverlap),
    },
  });

  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/patient");
  revalidatePath("/dashboard/admin");
  revalidatePath(`/booking/${appointment.doctorId}`);

  const clinic = getClinicConfig();
  const whatsappUrl = appointmentRescheduledLink({
    patientName: appointment.patient.fullName,
    patientPhone: appointment.patient.phone,
    doctorName: appointment.doctor.user.fullName,
    type: asAppointmentType(appointment.type),
    oldScheduledAtUTC,
    scheduledAtUTC: targetInstant,
    durationMinutes,
    priceEGP: toEgp(appointment.priceEGP),
    zoomMeetingUrl: appointment.zoomMeetingUrl,
    zoomPasscode: appointment.zoomPasscode,
    roomNumber: appointment.doctor.roomNumber ?? null,
    clinicAddressAr: clinic.addressAr,
    clinicMapsUrl: clinic.mapsUrl,
    reason,
  });

  return success({
    appointmentId,
    oldScheduledAtUTC: oldScheduledAtUTC.toISOString(),
    newScheduledAtUTC: targetInstant.toISOString(),
    whatsappRescheduleUrl: whatsappUrl,
  });
}

/** Doctor or Admin cancels an appointment on a patient. */
export async function doctorCancelAppointmentAction(
  _prevState: ActionResult<{ appointmentId: string; whatsappCancelUrl: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ appointmentId: string; whatsappCancelUrl: string }>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = cancelByDoctorSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى كتابة سبب الإلغاء للمريض (٥ أحرف على الأقل).",
      "Please provide a cancellation reason for the patient.",
      toFieldErrors(parsed.error),
    );
  }

  const { appointmentId, reason } = parsed.data;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: { select: { id: true, userId: true, roomNumber: true, user: { select: { fullName: true } } } },
      patient: { select: { id: true, fullName: true, phone: true } },
    },
  });

  if (!appointment) return Failures.notFound("الحجز المطلوب");

  if (guard.data.user.role === "DOCTOR" && appointment.doctor.userId !== guard.data.user.id) {
    return Failures.forbidden();
  }

  if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED") {
    return failure(
      "INVALID_STATE",
      "لا يمكن إلغاء جلسة مكتملة أو ملغية مسبقاً.",
      "Cannot cancel a completed or already cancelled session.",
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancellationReason: reason,
        slotLockKey: appointment.id, // Frees the composite lock
        holdExpiresAt: null,
      },
    });

    await tx.paymentProof.updateMany({
      where: { appointmentId, status: "UNDER_REVIEW" },
      data: {
        status: "REJECTED",
        reviewedAt: now,
        reviewedById: guard.data.user.id,
        rejectionReason: `تم إلغاء الموعد من قِبل الطبيب: ${reason}`,
      },
    });

    // Auto-issue patient credit if the cancelled appointment was confirmed and paid for
    if (appointment.status === "CONFIRMED") {
      await tx.patientCredit.create({
        data: {
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          amountEGP: appointment.priceEGP,
          kind: "CANCELLATION",
          reason: `إلغاء جلسة من قبل الطبيب/الإدارة: ${reason}`,
          issuedById: guard.data.user.id,
        },
      });
    }
  });

  await recordAudit({
    actorId: guard.data.user.id,
    action: "APPOINTMENT_CANCELLED_BY_DOCTOR",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: { byRole: guard.data.user.role, doctorId: appointment.doctorId },
  });

  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/patient");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/credits");
  revalidatePath(`/booking/${appointment.doctorId}`);

  const whatsappUrl = clinicCancellationLink({
    patientName: appointment.patient.fullName,
    patientPhone: appointment.patient.phone,
    doctorName: appointment.doctor.user.fullName,
    scheduledAtUTC: appointment.scheduledAtUTC,
    roomNumber: appointment.doctor.roomNumber ?? null,
    reason,
  });

  return success({
    appointmentId,
    whatsappCancelUrl: whatsappUrl,
  });
}

/** Admin releases a pending unpaid hold. */
export async function releaseReservationAction(
  _prevState: ActionResult<{ appointmentId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ appointmentId: string }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = releaseReservationSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
  });

  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "معرّف غير صالح.", "Invalid identifier.");
  }

  const updated = await prisma.appointment.updateMany({
    where: { id: parsed.data.appointmentId, status: "PENDING_PAYMENT_PROOF" },
    data: {
      status: "EXPIRED",
      slotLockKey: parsed.data.appointmentId,
      holdExpiresAt: null,
    },
  });

  if (updated.count === 0) {
    return failure(
      "CONFLICT",
      "تغيّرت حالة الحجز بالفعل — يرجى تحديث الصفحة.",
      "The reservation status has changed. Please refresh.",
    );
  }

  await recordAudit({
    actorId: guard.data.user.id,
    action: "APPOINTMENT_CANCELLED",
    entityType: "Appointment",
    entityId: parsed.data.appointmentId,
    metadata: { releasedByAdmin: true },
  });

  revalidatePath("/dashboard/admin");
  return success({ appointmentId: parsed.data.appointmentId });
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

export async function completeAppointmentAction(
  _prevState: ActionResult<{ appointmentId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ appointmentId: string }>> {
  const guard = await requireRole(["DOCTOR", "ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = completeAppointmentSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
  });
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "معرّف الحجز غير صالح.", "Invalid appointment id.");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    select: { id: true, doctorId: true, status: true, scheduledAtUTC: true, doctor: { select: { userId: true } } },
  });

  if (!appointment) return Failures.notFound("الحجز المطلوب");
  if (guard.data.user.role === "DOCTOR" && appointment.doctor.userId !== guard.data.user.id) {
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

export async function getPatientHistoryAction(
  patientId: string,
): Promise<ActionResult<ClinicalRecordView[]>> {
  const guard = await requireRole(["DOCTOR"]);
  if (!guard.ok) return guard;

  const profile = await resolveDoctorProfile(guard.data.user.id);
  if (!profile.ok) return profile;

  // Authorization invariant: doctor must share at least one appointment with patient
  const shared = await prisma.appointment.findFirst({
    where: { patientId, doctorId: profile.data.doctorId },
    select: { id: true },
  });

  if (!shared) {
    return Failures.forbidden();
  }

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
