"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import { requireRole } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/security/audit";

export interface DispatchStatusPayload {
  appointmentId: string;
  party: "PATIENT" | "DOCTOR";
  notifiedAt: string;
}

/**
 * Mark that a session notification link (WhatsApp brief or confirmation) was opened.
 *
 * NOTE: This is a best-effort operational record that the desk or doctor triggered the
 * deep-link action in their browser. WhatsApp does not provide delivery receipts for
 * click-to-chat links, so this represents dispatch action timestamp, not delivery proof.
 */
export async function markSessionDispatchAction(
  appointmentId: string,
  party: "PATIENT" | "DOCTOR",
): Promise<ActionResult<DispatchStatusPayload>> {
  const guard = await requireRole(["ADMIN", "DOCTOR"]);
  if (!guard.ok) return guard;
  const { user } = guard.data;

  if (!appointmentId || !["PATIENT", "DOCTOR"].includes(party)) {
    return failure("VALIDATION_ERROR", "بيانات الإشعار غير صالحة.", "Invalid dispatch parameters.");
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      doctorId: true,
      doctor: { select: { userId: true } },
    },
  });

  if (!appointment) return Failures.notFound("الحجز");

  // Doctors may only update dispatch status for their own appointments
  if (user.role === "DOCTOR" && appointment.doctor.userId !== user.id) {
    return Failures.forbidden();
  }

  const now = new Date();

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      ...(party === "PATIENT" ? { patientNotifiedAt: now } : { doctorNotifiedAt: now }),
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "SESSION_DISPATCH_LINK_OPENED",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: {
      party,
      openedBy: user.id,
      byRole: user.role,
    },
  });

  revalidatePath("/dashboard/admin/verification");
  revalidatePath("/dashboard/admin/appointments");
  revalidatePath("/dashboard/doctor");

  return success({
    appointmentId,
    party,
    notifiedAt: now.toISOString(),
  });
}
