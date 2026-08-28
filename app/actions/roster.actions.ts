"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import { requireRole } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/security/audit";
import { fromStringArray, toEgp, toStringArray } from "@/lib/serialization";
import {
  doctorConcernTagsUpdateSchema,
  doctorPricingUpdateSchema,
  doctorStatusToggleSchema,
  toFieldErrors,
} from "@/lib/validation/schemas";
import { asAppointmentStatus, asAppointmentType, type AppointmentStatus, type AppointmentType } from "@/lib/domain/enums";

/** Toggle doctor's patient intake status. */
export async function setDoctorAcceptingPatientsAction(
  _prevState: ActionResult<{ doctorId: string; isAcceptingPatients: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ doctorId: string; isAcceptingPatients: boolean }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = doctorStatusToggleSchema.safeParse({
    doctorId: formData.get("doctorId"),
    isAcceptingPatients: formData.get("isAcceptingPatients") === "true" || formData.get("isAcceptingPatients") === "on",
  });

  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "بيانات غير صالحة.", "Invalid input.", toFieldErrors(parsed.error));
  }

  const { doctorId, isAcceptingPatients } = parsed.data;

  const updated = await prisma.doctorProfile.update({
    where: { id: doctorId },
    data: { isAcceptingPatients },
    select: { id: true, isAcceptingPatients: true },
  });

  await recordAudit({
    actorId: guard.data.user.id,
    action: "DOCTOR_STATUS_TOGGLED",
    entityType: "DoctorProfile",
    entityId: doctorId,
    metadata: { isAcceptingPatients },
  });

  revalidatePath("/therapists");
  revalidatePath("/dashboard/admin");
  revalidatePath(`/booking/${doctorId}`);

  return success({
    doctorId: updated.id,
    isAcceptingPatients: updated.isAcceptingPatients,
  });
}

/** Update online and clinic session rates for a doctor. */
export async function updateDoctorPricingAction(
  _prevState: ActionResult<{ doctorId: string; sessionPriceOnline: number; sessionPriceOffline: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ doctorId: string; sessionPriceOnline: number; sessionPriceOffline: number }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = doctorPricingUpdateSchema.safeParse({
    doctorId: formData.get("doctorId"),
    sessionPriceOnline: formData.get("sessionPriceOnline"),
    sessionPriceOffline: formData.get("sessionPriceOffline"),
  });

  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "بيانات الأسعار غير صالحة.", "Invalid pricing values.", toFieldErrors(parsed.error));
  }

  const { doctorId, sessionPriceOnline, sessionPriceOffline } = parsed.data;

  const updated = await prisma.doctorProfile.update({
    where: { id: doctorId },
    data: {
      sessionPriceOnline: new Prisma.Decimal(sessionPriceOnline),
      sessionPriceOffline: new Prisma.Decimal(sessionPriceOffline),
    },
    select: { id: true, sessionPriceOnline: true, sessionPriceOffline: true },
  });

  await recordAudit({
    actorId: guard.data.user.id,
    action: "DOCTOR_PRICING_UPDATED",
    entityType: "DoctorProfile",
    entityId: doctorId,
    metadata: { sessionPriceOnline, sessionPriceOffline },
  });

  revalidatePath("/therapists");
  revalidatePath("/dashboard/admin");
  revalidatePath(`/booking/${doctorId}`);

  return success({
    doctorId: updated.id,
    sessionPriceOnline: toEgp(updated.sessionPriceOnline),
    sessionPriceOffline: toEgp(updated.sessionPriceOffline),
  });
}

/** Update the concern tags used for patient triage matching. */
export async function updateDoctorConcernTagsAction(
  _prevState: ActionResult<{ doctorId: string; concernTags: string[] }> | null,
  formData: FormData,
): Promise<ActionResult<{ doctorId: string; concernTags: string[] }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const concernTagsRaw = formData.getAll("concernTags");
  const parsed = doctorConcernTagsUpdateSchema.safeParse({
    doctorId: formData.get("doctorId"),
    concernTags: concernTagsRaw.length > 0 ? concernTagsRaw : (formData.get("concernTagsJson") ? JSON.parse(formData.get("concernTagsJson") as string) : []),
  });

  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "بيانات وسوم التخصص غير صالحة.", "Invalid concern tags.", toFieldErrors(parsed.error));
  }

  const { doctorId, concernTags } = parsed.data;

  const updated = await prisma.doctorProfile.update({
    where: { id: doctorId },
    data: {
      concernTagsJson: fromStringArray(concernTags),
    },
    select: { id: true, concernTagsJson: true },
  });

  await recordAudit({
    actorId: guard.data.user.id,
    action: "DOCTOR_CONCERN_TAGS_UPDATED",
    entityType: "DoctorProfile",
    entityId: doctorId,
    metadata: { tagsCount: concernTags.length },
  });

  revalidatePath("/therapists");
  revalidatePath("/intake");
  revalidatePath("/dashboard/admin");

  return success({
    doctorId: updated.id,
    concernTags: toStringArray(updated.concernTagsJson),
  });
}

// ---------------------------------------------------------------------------
// Admin Appointments Console Query
// ---------------------------------------------------------------------------

export interface AdminAppointmentRow {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAtUTC: string;
  durationMinutes: number;
  priceEGP: number;
  zoomMeetingUrl: string | null;
  zoomPasscode: string | null;
  rescheduledFromUTC: string | null;
  cancellationReason: string | null;
  createdAtUTC: string;
}

export interface AdminAppointmentsFilter {
  doctorId?: string;
  status?: string;
  search?: string;
  fromUTC?: string;
  toUTC?: string;
  take?: number;
  skip?: number;
}

/** Paginated admin query across all clinic appointments. */
export async function getAdminAppointmentsAction(
  filter?: AdminAppointmentsFilter,
): Promise<ActionResult<{ appointments: AdminAppointmentRow[]; totalCount: number }>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  const take = Math.min(Math.max(filter?.take ?? 50, 1), 100);
  const skip = Math.max(filter?.skip ?? 0, 0);

  const whereClause: Prisma.AppointmentWhereInput = {};

  if (filter?.doctorId) {
    whereClause.doctorId = filter.doctorId;
  }

  if (filter?.status && filter.status !== "ALL") {
    whereClause.status = filter.status;
  }

  if (filter?.fromUTC || filter?.toUTC) {
    whereClause.scheduledAtUTC = {
      ...(filter.fromUTC ? { gte: new Date(filter.fromUTC) } : {}),
      ...(filter.toUTC ? { lte: new Date(filter.toUTC) } : {}),
    };
  }

  if (filter?.search && filter.search.trim()) {
    const q = filter.search.trim();
    whereClause.patient = {
      OR: [
        { fullName: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ],
    };
  }

  const [totalCount, appointments] = await Promise.all([
    prisma.appointment.count({ where: whereClause }),
    prisma.appointment.findMany({
      where: whereClause,
      orderBy: { scheduledAtUTC: "desc" },
      take,
      skip,
      include: {
        patient: { select: { id: true, fullName: true, phone: true } },
        doctor: { select: { id: true, user: { select: { fullName: true } } } },
      },
    }),
  ]);

  return success({
    totalCount,
    appointments: appointments.map((a) => ({
      id: a.id,
      patientId: a.patient.id,
      patientName: a.patient.fullName,
      patientPhone: a.patient.phone,
      doctorId: a.doctor.id,
      doctorName: a.doctor.user.fullName,
      type: asAppointmentType(a.type),
      status: asAppointmentStatus(a.status),
      scheduledAtUTC: a.scheduledAtUTC.toISOString(),
      durationMinutes: a.durationMinutes,
      priceEGP: toEgp(a.priceEGP),
      zoomMeetingUrl: a.zoomMeetingUrl,
      zoomPasscode: a.zoomPasscode,
      rescheduledFromUTC: a.rescheduledFromUTC?.toISOString() ?? null,
      cancellationReason: a.cancellationReason,
      createdAtUTC: a.createdAt.toISOString(),
    })),
  });
}
