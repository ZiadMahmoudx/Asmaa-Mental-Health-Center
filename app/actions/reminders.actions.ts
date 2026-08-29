"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import { requireRole } from "@/lib/auth/guards";
import { getClinicConfig } from "@/lib/clinic-config";
import { formatCairo, sessionReminderLink } from "@/lib/whatsapp";
import { asAppointmentType } from "@/lib/domain/enums";
import { cuidSchema } from "@/lib/validation/schemas";

export interface PendingReminderRow {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  type: "ONLINE" | "OFFLINE";
  scheduledAtUTC: string;
  durationMinutes: number;
  roomNumber: string | null;
  zoomMeetingUrl: string | null;
  whatsappReminderUrl: string;
  hoursUntilSession: number;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * ADMIN: Fetch upcoming confirmed appointments due for a reminder within the next 48 hours.
 */
export async function getPendingRemindersAction(): Promise<ActionResult<PendingReminderRow[]>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  const now = new Date();
  const maxHorizon = new Date(now.getTime() + 48 * HOUR_MS);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      scheduledAtUTC: { gte: now, lte: maxHorizon },
    },
    orderBy: { scheduledAtUTC: "asc" },
    include: {
      patient: { select: { id: true, fullName: true, phone: true } },
      doctor: { select: { roomNumber: true, user: { select: { fullName: true } } } },
    },
  });

  const clinic = getClinicConfig();

  const rows: PendingReminderRow[] = appointments.map((app) => {
    const hoursUntilSession = Math.max(
      0,
      Math.round((app.scheduledAtUTC.getTime() - now.getTime()) / HOUR_MS),
    );

    const whatsappReminderUrl = sessionReminderLink({
      patientName: app.patient.fullName,
      patientPhone: app.patient.phone,
      doctorName: app.doctor.user.fullName,
      type: asAppointmentType(app.type),
      scheduledAtUTC: app.scheduledAtUTC,
      zoomMeetingUrl: app.zoomMeetingUrl,
      zoomPasscode: app.zoomPasscode,
      roomNumber: app.type === "OFFLINE" ? app.doctor.roomNumber : null,
      clinicAddressAr: clinic.addressAr,
      clinicMapsUrl: clinic.mapsUrl,
    });

    return {
      appointmentId: app.id,
      patientName: app.patient.fullName,
      patientPhone: app.patient.phone,
      doctorName: app.doctor.user.fullName,
      type: asAppointmentType(app.type),
      scheduledAtUTC: app.scheduledAtUTC.toISOString(),
      durationMinutes: app.durationMinutes,
      roomNumber: app.type === "OFFLINE" ? app.doctor.roomNumber : null,
      zoomMeetingUrl: app.zoomMeetingUrl,
      whatsappReminderUrl,
      hoursUntilSession,
    };
  });

  return success(rows);
}

/**
 * ADMIN: Mark a reminder as sent manually from the dashboard.
 */
export async function markReminderSentAction(
  _prevState: ActionResult<{ appointmentId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ appointmentId: string }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const parsed = cuidSchema.safeParse(formData.get("appointmentId"));
  if (!parsed.success) {
    return failure("VALIDATION_ERROR", "معرّف الحجز غير صالح.", "Invalid appointment ID.");
  }

  const appointmentId = parsed.data;

  await prisma.appointment.updateMany({
    where: { id: appointmentId, reminderSentAt: null },
    data: { reminderSentAt: new Date() },
  });

  revalidatePath("/dashboard/admin/reminders");
  revalidatePath("/dashboard/admin");

  return success({ appointmentId });
}
