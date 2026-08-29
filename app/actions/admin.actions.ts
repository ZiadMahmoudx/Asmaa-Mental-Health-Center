"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import {
  approvePaymentSchema,
  assignMeetingSchema,
  cancelAppointmentSchema,
  rejectPaymentSchema,
  toFieldErrors,
} from "@/lib/validation/schemas";
import { requireRole } from "@/lib/auth/guards";
import { consumeRateLimit, RateLimits } from "@/lib/security/rate-limit";
import { recordAudit } from "@/lib/security/audit";
import { ACTIVE_SLOT_LOCK } from "@/lib/constants";
import { asAppointmentType } from "@/lib/domain/enums";
import { bookingPolicy, getClinicConfig } from "@/lib/clinic-config";
import { env } from "@/lib/env";
import { toEgp } from "@/lib/serialization";
import {
  bookingConfirmedLink,
  doctorSessionBriefLink,
  paymentRejectedLink,
  sessionReminderLink,
} from "@/lib/whatsapp";

/**
 * Admin Verification Desk - steps 4 and 5 of the manual payment flow.
 *
 * Every action here is a state transition on money or on a patient's confirmed
 * care, so each one:
 *   - re-checks the ADMIN role at the data layer (middleware only guards pages),
 *   - performs the transition with a conditional `updateMany` on the expected
 *     current status, so a double-click or two admins working the same queue
 *     cannot approve the same receipt twice,
 *   - writes an audit entry naming the reviewer,
 *   - returns a ready-to-send WhatsApp link rather than sending anything itself.
 */

const MINUTE_MS = 60_000;

export interface ApprovalPayload {
  appointmentId: string;
  paymentProofId: string;
  status: "CONFIRMED";
  type: "ONLINE" | "OFFLINE";
  /** Pre-filled confirmation message to the patient (Zoom link or directions). */
  whatsappConfirmationUrl: string;
  /** Pre-filled reminder to send closer to the session. */
  whatsappReminderUrl: string;
  /** Pre-filled brief to the treating doctor (join link or room). */
  whatsappDoctorUrl: string;
}

// ---------------------------------------------------------------------------
// Approve
// ---------------------------------------------------------------------------

export async function approvePaymentAction(
  _prevState: ActionResult<ApprovalPayload> | null,
  formData: FormData,
): Promise<ActionResult<ApprovalPayload>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;
  const { user: admin } = guard.data;

  const throttle = consumeRateLimit(`admin:${admin.id}`, RateLimits.adminReview);
  if (!throttle.allowed) return Failures.rateLimited(throttle.retryAfterSeconds);

  const parsed = approvePaymentSchema.safeParse({
    paymentProofId: formData.get("paymentProofId"),
    roomId: formData.get("roomId") ?? "",
    zoomMeetingUrl: formData.get("zoomMeetingUrl") ?? "",
    zoomPasscode: formData.get("zoomPasscode") ?? "",
    clinicNotes: formData.get("clinicNotes") ?? "",
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات الاعتماد غير صالحة.",
      "Invalid approval details.",
      toFieldErrors(parsed.error),
    );
  }

  const { paymentProofId, roomId, zoomMeetingUrl, zoomPasscode, clinicNotes } = parsed.data;

  const proof = await prisma.paymentProof.findUnique({
    where: { id: paymentProofId },
    select: {
      id: true,
      status: true,
      appointmentId: true,
      appointment: {
        select: {
          id: true,
          type: true,
          status: true,
          scheduledAtUTC: true,
          durationMinutes: true,
          priceEGP: true,
          zoomMeetingUrl: true,
          zoomPasscode: true,
          roomId: true,
          room: { select: { id: true, name: true } },
          patient: { select: { fullName: true, phone: true } },
          doctor: {
            select: { roomNumber: true, user: { select: { fullName: true, phone: true } } },
          },
        },
      },
    },
  });

  if (!proof) return Failures.notFound("إيصال الدفع");

  if (proof.status !== "UNDER_REVIEW") {
    return failure(
      "INVALID_STATE",
      "تمت مراجعة هذا الإيصال بالفعل.",
      "This receipt has already been reviewed.",
    );
  }

  const appointment = proof.appointment;
  const appointmentType = asAppointmentType(appointment.type);

  if (appointment.status !== "PAYMENT_UNDER_REVIEW") {
    return failure(
      "INVALID_STATE",
      "حالة الحجز تغيّرت ولم تعد قابلة للاعتماد. يرجى تحديث الصفحة.",
      "The appointment status changed and can no longer be approved.",
    );
  }

  // An online consultation is not "confirmed" for the patient until there is a
  // link to join, so the desk cannot approve one without attaching it.
  const effectiveZoomUrl = zoomMeetingUrl ?? appointment.zoomMeetingUrl;
  if (appointmentType === "ONLINE" && !effectiveZoomUrl) {
    return failure(
      "VALIDATION_ERROR",
      "الجلسة أونلاين: يجب إرفاق رابط زووم قبل اعتماد الحجز.",
      "This is an online session: attach the Zoom link before approving.",
      { zoomMeetingUrl: "رابط زووم مطلوب لاعتماد الجلسات الأونلاين" },
    );
  }

  let targetRoomId: string | null = appointment.roomId;
  let targetRoomName: string | null = appointment.room?.name ?? appointment.doctor.roomNumber;

  if (appointmentType === "OFFLINE" && roomId) {
    const room = await prisma.clinicRoom.findFirst({
      where: { id: roomId, isActive: true },
      select: { id: true, name: true },
    });
    if (!room) {
      return failure(
        "VALIDATION_ERROR",
        "الغرفة المحددة غير موجودة أو غير مفعلة.",
        "The selected room does not exist or is inactive.",
        { roomId: "الغرفة غير متاحة" },
      );
    }
    targetRoomId = room.id;
    targetRoomName = room.name;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const proofUpdated = await tx.paymentProof.updateMany({
        where: { id: paymentProofId, status: "UNDER_REVIEW" },
        data: {
          status: "APPROVED",
          reviewedById: admin.id,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

      if (proofUpdated.count === 0) {
        throw new Prisma.PrismaClientKnownRequestError("proof already reviewed", {
          code: "P2025",
          clientVersion: Prisma.prismaVersion.client,
        });
      }

      const appointmentUpdated = await tx.appointment.updateMany({
        where: { id: appointment.id, status: "PAYMENT_UNDER_REVIEW" },
        data: {
          status: "CONFIRMED",
          holdExpiresAt: null,
          slotLockKey: ACTIVE_SLOT_LOCK,
          roomId: appointmentType === "OFFLINE" ? targetRoomId : null,
          zoomMeetingUrl: appointmentType === "ONLINE" ? effectiveZoomUrl : null,
          zoomPasscode:
            appointmentType === "ONLINE" ? (zoomPasscode ?? appointment.zoomPasscode) : null,
          clinicNotes: clinicNotes ?? undefined,
        },
      });

      if (appointmentUpdated.count === 0) {
        throw new Prisma.PrismaClientKnownRequestError("appointment state changed", {
          code: "P2025",
          clientVersion: Prisma.prismaVersion.client,
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure(
        "CONFLICT",
        "الغرفة المحددة محجوزة بالفعل في نفس التوقيت لجلسة أخرى.",
        "The selected clinic room is already occupied at this time by another consultation.",
        { roomId: "الغرفة محجوزة في هذا التوقيت" },
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return failure(
        "CONFLICT",
        "تم اعتماد أو تعديل هذا الإيصال من مراجع آخر للتو. يرجى تحديث الصفحة.",
        "Another reviewer just acted on this receipt. Please refresh.",
      );
    }
    console.error("[admin] approval failed", error);
    return Failures.internal();
  }

  await recordAudit({
    actorId: admin.id,
    action: "PAYMENT_APPROVED",
    entityType: "PaymentProof",
    entityId: paymentProofId,
    metadata: {
      appointmentId: appointment.id,
      type: appointmentType,
      priceEGP: toEgp(appointment.priceEGP),
      zoomAttached: Boolean(effectiveZoomUrl),
      roomId: targetRoomId,
      roomName: targetRoomName,
    },
  });

  const clinic = getClinicConfig();
  const summary = {
    patientName: appointment.patient.fullName,
    patientPhone: appointment.patient.phone,
    doctorName: appointment.doctor.user.fullName,
    type: appointmentType,
    scheduledAtUTC: appointment.scheduledAtUTC,
    durationMinutes: appointment.durationMinutes,
    priceEGP: toEgp(appointment.priceEGP),
    zoomMeetingUrl: effectiveZoomUrl,
    zoomPasscode: zoomPasscode ?? appointment.zoomPasscode,
    roomNumber: targetRoomName,
    clinicAddressAr: clinic.addressAr,
    clinicMapsUrl: clinic.mapsUrl,
  } as const;

  const appUrl = env.APP_URL;
  const doctorBrief = {
    doctorName: appointment.doctor.user.fullName,
    doctorPhone: appointment.doctor.user.phone,
    patientName: appointment.patient.fullName,
    patientPhone: appointment.patient.phone,
    type: appointmentType,
    scheduledAtUTC: appointment.scheduledAtUTC,
    durationMinutes: appointment.durationMinutes,
    zoomMeetingUrl: effectiveZoomUrl,
    zoomPasscode: zoomPasscode ?? appointment.zoomPasscode,
    roomName: targetRoomName,
    appointmentRef: appointment.id.slice(-8),
    dashboardUrl: `${appUrl}/dashboard/doctor?appointmentId=${appointment.id}`,
  } as const;

  revalidatePath("/dashboard/admin/verification");
  revalidatePath("/dashboard/patient");
  revalidatePath("/dashboard/doctor");

  return success({
    appointmentId: appointment.id,
    paymentProofId,
    status: "CONFIRMED",
    type: appointmentType,
    whatsappConfirmationUrl: bookingConfirmedLink(summary),
    whatsappReminderUrl: sessionReminderLink(summary),
    whatsappDoctorUrl: doctorSessionBriefLink(doctorBrief),
  });
}

// ---------------------------------------------------------------------------
// Reject
// ---------------------------------------------------------------------------

export interface RejectionPayload {
  appointmentId: string;
  paymentProofId: string;
  /** Pre-filled WhatsApp message explaining the reason and linking the retry. */
  whatsappRejectionUrl: string;
  /** Minutes the patient now has to submit a corrected receipt. */
  graceMinutes: number;
}

export async function rejectPaymentAction(
  _prevState: ActionResult<RejectionPayload> | null,
  formData: FormData,
): Promise<ActionResult<RejectionPayload>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;
  const { user: admin } = guard.data;

  const throttle = consumeRateLimit(`admin:${admin.id}`, RateLimits.adminReview);
  if (!throttle.allowed) return Failures.rateLimited(throttle.retryAfterSeconds);

  const parsed = rejectPaymentSchema.safeParse({
    paymentProofId: formData.get("paymentProofId"),
    rejectionReason: formData.get("rejectionReason"),
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى كتابة سبب واضح للرفض.",
      "Please provide a clear rejection reason.",
      toFieldErrors(parsed.error),
    );
  }

  const { paymentProofId, rejectionReason } = parsed.data;

  const proof = await prisma.paymentProof.findUnique({
    where: { id: paymentProofId },
    select: {
      id: true,
      status: true,
      appointment: {
        select: {
          id: true,
          status: true,
          scheduledAtUTC: true,
          patient: { select: { fullName: true, phone: true } },
          doctor: { select: { user: { select: { fullName: true } } } },
        },
      },
    },
  });

  if (!proof) return Failures.notFound("إيصال الدفع");
  if (proof.status !== "UNDER_REVIEW") {
    return failure(
      "INVALID_STATE",
      "تمت مراجعة هذا الإيصال بالفعل.",
      "This receipt has already been reviewed.",
    );
  }

  const appointment = proof.appointment;

  // The slot stays held for a grace window so the patient can correct and
  // resubmit rather than losing the appointment over a blurry screenshot.
  const graceMinutes = bookingPolicy.holdMinutes;
  const graceDeadline = new Date(Date.now() + graceMinutes * MINUTE_MS);
  const sessionIsFuture = appointment.scheduledAtUTC.getTime() > Date.now();

  try {
    await prisma.$transaction(async (tx) => {
      const proofUpdated = await tx.paymentProof.updateMany({
        where: { id: paymentProofId, status: "UNDER_REVIEW" },
        data: {
          status: "REJECTED",
          reviewedById: admin.id,
          reviewedAt: new Date(),
          rejectionReason,
        },
      });

      if (proofUpdated.count === 0) {
        throw new Prisma.PrismaClientKnownRequestError("proof already reviewed", {
          code: "P2025",
          clientVersion: Prisma.prismaVersion.client,
        });
      }

      const appointmentUpdated = await tx.appointment.updateMany({
        where: { id: appointment.id, status: "PAYMENT_UNDER_REVIEW" },
        data: sessionIsFuture
          ? {
              status: "REJECTED",
              slotLockKey: ACTIVE_SLOT_LOCK, // still reserved during the grace window
              holdExpiresAt: graceDeadline,
            }
          : {
              // Nothing to salvage for a session that has already passed.
              status: "REJECTED",
              slotLockKey: appointment.id,
              holdExpiresAt: null,
            },
      });

      if (appointmentUpdated.count === 0) {
        throw new Prisma.PrismaClientKnownRequestError("appointment state changed", {
          code: "P2025",
          clientVersion: Prisma.prismaVersion.client,
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return failure(
        "CONFLICT",
        "تم التعامل مع هذا الإيصال من مراجع آخر للتو. يرجى تحديث الصفحة.",
        "Another reviewer just acted on this receipt. Please refresh.",
      );
    }
    console.error("[admin] rejection failed", error);
    return Failures.internal();
  }

  await recordAudit({
    actorId: admin.id,
    action: "PAYMENT_REJECTED",
    entityType: "PaymentProof",
    entityId: paymentProofId,
    metadata: { appointmentId: appointment.id, graceMinutes: sessionIsFuture ? graceMinutes : 0 },
  });

  revalidatePath("/dashboard/admin/verification");
  revalidatePath("/dashboard/patient");

  return success({
    appointmentId: appointment.id,
    paymentProofId,
    graceMinutes: sessionIsFuture ? graceMinutes : 0,
    whatsappRejectionUrl: paymentRejectedLink({
      patientName: appointment.patient.fullName,
      patientPhone: appointment.patient.phone,
      doctorName: appointment.doctor.user.fullName,
      scheduledAtUTC: appointment.scheduledAtUTC,
      rejectionReason,
      retryUrl: `${env.APP_URL}/payment/${appointment.id}`,
    }),
  });
}

// ---------------------------------------------------------------------------
// Attach or replace a meeting link
// ---------------------------------------------------------------------------

export interface MeetingLinkPayload {
  appointmentId: string;
  zoomMeetingUrl: string;
  whatsappConfirmationUrl: string;
  whatsappDoctorUrl: string;
}

/**
 * Attach (or replace) the Zoom link on an online appointment. Available to the
 * desk and to the treating doctor, since either may create the meeting.
 */
export async function assignMeetingLinkAction(
  _prevState: ActionResult<MeetingLinkPayload> | null,
  formData: FormData,
): Promise<ActionResult<MeetingLinkPayload>> {
  const guard = await requireRole(["ADMIN", "DOCTOR"], formData);
  if (!guard.ok) return guard;
  const { user } = guard.data;

  const parsed = assignMeetingSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    zoomMeetingUrl: formData.get("zoomMeetingUrl"),
    zoomMeetingId: formData.get("zoomMeetingId") ?? "",
    zoomPasscode: formData.get("zoomPasscode") ?? "",
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات رابط الاجتماع غير صالحة.",
      "Invalid meeting link details.",
      toFieldErrors(parsed.error),
    );
  }

  const { appointmentId, zoomMeetingUrl, zoomMeetingId, zoomPasscode } = parsed.data;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      type: true,
      status: true,
      scheduledAtUTC: true,
      durationMinutes: true,
      priceEGP: true,
      patient: { select: { fullName: true, phone: true } },
      doctor: {
        select: { id: true, userId: true, roomNumber: true, user: { select: { fullName: true, phone: true } } },
      },
    },
  });

  if (!appointment) return Failures.notFound("الحجز المطلوب");

  // A doctor may only touch their own appointments; ADMIN is unrestricted.
  if (user.role === "DOCTOR" && appointment.doctor.userId !== user.id) {
    return Failures.forbidden();
  }

  if (asAppointmentType(appointment.type) !== "ONLINE") {
    return failure(
      "INVALID_STATE",
      "هذه زيارة حضورية بالعيادة ولا تحتاج رابط اجتماع.",
      "This is an in-person visit and does not need a meeting link.",
    );
  }

  if (!["PAYMENT_UNDER_REVIEW", "CONFIRMED"].includes(appointment.status)) {
    return failure(
      "INVALID_STATE",
      "لا يمكن إرفاق رابط اجتماع لحجز غير مؤكد.",
      "A meeting link can only be attached to a confirmed booking.",
    );
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { zoomMeetingUrl, zoomMeetingId, zoomPasscode },
  });

  await recordAudit({
    actorId: user.id,
    action: "ZOOM_LINK_ASSIGNED",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: { byRole: user.role },
  });

  const clinic = getClinicConfig();
  const appUrl = env.APP_URL;

  revalidatePath("/dashboard/admin/verification");
  revalidatePath("/dashboard/patient");
  revalidatePath("/dashboard/doctor");

  return success({
    appointmentId,
    zoomMeetingUrl,
    whatsappConfirmationUrl: bookingConfirmedLink({
      patientName: appointment.patient.fullName,
      patientPhone: appointment.patient.phone,
      doctorName: appointment.doctor.user.fullName,
      type: "ONLINE",
      scheduledAtUTC: appointment.scheduledAtUTC,
      durationMinutes: appointment.durationMinutes,
      priceEGP: toEgp(appointment.priceEGP),
      zoomMeetingUrl,
      zoomPasscode,
      clinicAddressAr: clinic.addressAr,
      clinicMapsUrl: clinic.mapsUrl,
    }),
    whatsappDoctorUrl: doctorSessionBriefLink({
      doctorName: appointment.doctor.user.fullName,
      doctorPhone: appointment.doctor.user.phone,
      patientName: appointment.patient.fullName,
      patientPhone: appointment.patient.phone,
      type: "ONLINE",
      scheduledAtUTC: appointment.scheduledAtUTC,
      durationMinutes: appointment.durationMinutes,
      zoomMeetingUrl,
      zoomPasscode,
      appointmentRef: appointmentId.slice(-8),
      dashboardUrl: `${appUrl}/dashboard/doctor?appointmentId=${appointmentId}`,
    }),
  });
}

// ---------------------------------------------------------------------------
// Administrative cancellation
// ---------------------------------------------------------------------------

export async function adminCancelAppointmentAction(
  _prevState: ActionResult<{ appointmentId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ appointmentId: string }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;
  const { user: admin } = guard.data;

  const parsed = cancelAppointmentSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    reason: formData.get("reason") ?? undefined,
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "طلب الإلغاء غير صالح.",
      "Invalid cancellation request.",
      toFieldErrors(parsed.error),
    );
  }

  const { appointmentId, reason } = parsed.data;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, status: true, patientId: true, priceEGP: true },
  });

  if (!appointment) return Failures.notFound("الحجز المطلوب");
  if (["CANCELLED", "COMPLETED"].includes(appointment.status)) {
    return failure(
      "INVALID_STATE",
      "لا يمكن إلغاء هذا الحجز في حالته الحالية.",
      "This appointment can no longer be cancelled.",
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.appointment.updateMany({
      where: { id: appointmentId, status: appointment.status },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason ?? "ألغت إدارة المركز الحجز",
        slotLockKey: appointmentId, // release the slot
        holdExpiresAt: null,
      },
    });

    // Any receipt still in the queue is closed out with the cancellation, so the
    // desk is not left reviewing a booking that no longer exists.
    if (result.count > 0) {
      await tx.paymentProof.updateMany({
        where: { appointmentId, status: "UNDER_REVIEW" },
        data: {
          status: "REJECTED",
          reviewedById: admin.id,
          reviewedAt: new Date(),
          rejectionReason: reason ?? "تم إلغاء الحجز من إدارة المركز",
        },
      });

      // Auto-issue patient credit for confirmed appointments
      if (appointment.status === "CONFIRMED") {
        await tx.patientCredit.create({
          data: {
            patientId: appointment.patientId,
            appointmentId: appointment.id,
            amountEGP: appointment.priceEGP,
            kind: "CANCELLATION",
            reason: reason ?? "ألغت إدارة المركز الحجز",
            issuedById: admin.id,
          },
        });
      }
    }

    return result.count;
  });

  if (updated === 0) {
    return failure(
      "CONFLICT",
      "تم تحديث حالة الحجز بالفعل. يرجى تحديث الصفحة.",
      "This appointment was updated already. Please refresh.",
    );
  }

  await recordAudit({
    actorId: admin.id,
    action: "APPOINTMENT_CANCELLED",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: { by: "ADMIN", previousStatus: appointment.status },
  });

  revalidatePath("/dashboard/admin/verification");
  revalidatePath("/dashboard/admin/credits");
  revalidatePath("/dashboard/patient");
  revalidatePath("/dashboard/doctor");

  return success({ appointmentId });
}

// ---------------------------------------------------------------------------
// Desk history
// ---------------------------------------------------------------------------

export interface ReviewedProofRow {
  paymentProofId: string;
  appointmentId: string;
  patientName: string;
  doctorName: string;
  method: string;
  status: "APPROVED" | "REJECTED";
  reviewedAtUTC: string | null;
  reviewedByName: string | null;
  rejectionReason: string | null;
  scheduledAtUTC: string;
  priceEGP: number;
}

/** Recently reviewed receipts, so the desk can audit its own decisions. */
export async function getReviewHistoryAction(
  limit = 30,
): Promise<ActionResult<ReviewedProofRow[]>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  const proofs = await prisma.paymentProof.findMany({
    where: { status: { in: ["APPROVED", "REJECTED"] } },
    orderBy: { reviewedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      appointmentId: true,
      method: true,
      status: true,
      reviewedAt: true,
      rejectionReason: true,
      reviewedBy: { select: { fullName: true } },
      appointment: {
        select: {
          scheduledAtUTC: true,
          priceEGP: true,
          patient: { select: { fullName: true } },
          doctor: { select: { user: { select: { fullName: true } } } },
        },
      },
    },
  });

  return success(
    proofs.map((proof) => ({
      paymentProofId: proof.id,
      appointmentId: proof.appointmentId,
      patientName: proof.appointment.patient.fullName,
      doctorName: proof.appointment.doctor.user.fullName,
      method: proof.method,
      status: proof.status as "APPROVED" | "REJECTED",
      reviewedAtUTC: proof.reviewedAt?.toISOString() ?? null,
      reviewedByName: proof.reviewedBy?.fullName ?? null,
      rejectionReason: proof.rejectionReason,
      scheduledAtUTC: proof.appointment.scheduledAtUTC.toISOString(),
      priceEGP: toEgp(proof.appointment.priceEGP),
    })),
  );
}
