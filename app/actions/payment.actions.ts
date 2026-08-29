"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { asAppointmentType, asPaymentMethod, type PaymentMethod } from "@/lib/domain/enums";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import { paymentProofSchema, toFieldErrors } from "@/lib/validation/schemas";
import { requireRole } from "@/lib/auth/guards";
import { consumeRateLimit, RateLimits } from "@/lib/security/rate-limit";
import { recordAudit } from "@/lib/security/audit";
import { deleteReceipt, RECEIPT_ERROR_MESSAGES, storeReceipt } from "@/lib/uploads";
import { getClinicConfig } from "@/lib/clinic-config";
import { ACTIVE_SLOT_LOCK } from "@/lib/constants";
import { env } from "@/lib/env";
import { toEgp } from "@/lib/serialization";
import { adminVerificationAlertLink } from "@/lib/whatsapp";

/**
 * Manual payment verification - patient side (steps 2 and 3 of the flow).
 *
 * The clinic takes InstaPay and Vodafone Cash transfers, which have no callback
 * or webhook: the only evidence a transfer happened is the screenshot the patient
 * uploads. Everything here is therefore built around a human reviewing that
 * evidence, with the software doing the parts humans are bad at - enforcing who
 * may upload against which appointment, checking the file is really an image or
 * PDF, and spotting a receipt that has already been used.
 */

const MINUTE_MS = 60_000;

export interface PaymentProofPayload {
  paymentProofId: string;
  appointmentId: string;
  status: "PAYMENT_UNDER_REVIEW";
  /** Ready-to-click alert for the verification desk's WhatsApp. */
  adminAlertWhatsappUrl: string;
}

// ---------------------------------------------------------------------------
// Patient: submit a receipt
// ---------------------------------------------------------------------------

export async function submitPaymentProofAction(
  _prevState: ActionResult<PaymentProofPayload> | null,
  formData: FormData,
): Promise<ActionResult<PaymentProofPayload>> {
  const guard = await requireRole(["PATIENT"], formData);
  if (!guard.ok) return guard;
  const { user } = guard.data;

  const throttle = consumeRateLimit(`receipt:${user.id}`, RateLimits.receiptUpload);
  if (!throttle.allowed) return Failures.rateLimited(throttle.retryAfterSeconds);

  const parsed = paymentProofSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    method: formData.get("method"),
    senderIdentifier: formData.get("senderIdentifier"),
    transactionRef: formData.get("transactionRef") ?? "",
    amountClaimedEGP: formData.get("amountClaimedEGP") || undefined,
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى مراجعة بيانات التحويل المدخلة.",
      "Please review the transfer details you entered.",
      toFieldErrors(parsed.error),
    );
  }

  const { appointmentId, method, senderIdentifier, transactionRef, amountClaimedEGP } = parsed.data;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      patientId: true,
      status: true,
      scheduledAtUTC: true,
      slotLockKey: true,
      holdExpiresAt: true,
      priceEGP: true,
      doctor: { select: { user: { select: { fullName: true } } } },
    },
  });

  if (!appointment) return Failures.notFound("الحجز المطلوب");
  if (appointment.patientId !== user.id) return Failures.forbidden();

  // A receipt is accepted only against a live hold, or a booking whose previous
  // receipt the desk rejected (the patient gets to correct and resubmit).
  const acceptsProof =
    appointment.status === "PENDING_PAYMENT_PROOF" || appointment.status === "REJECTED";

  if (!acceptsProof) {
    const messages: Partial<Record<typeof appointment.status, [string, string]>> = {
      PAYMENT_UNDER_REVIEW: [
        "تم استلام إيصالك بالفعل وهو قيد المراجعة حالياً.",
        "Your receipt has already been received and is under review.",
      ],
      CONFIRMED: [
        "هذا الحجز مؤكد بالفعل ولا يحتاج إيصالاً جديداً.",
        "This appointment is already confirmed.",
      ],
      CANCELLED: ["تم إلغاء هذا الحجز.", "This appointment was cancelled."],
      EXPIRED: [
        "انتهت مهلة حجز هذا الموعد وتم تحريره. يرجى حجز موعد جديد.",
        "The hold on this appointment expired and the slot was released. Please book again.",
      ],
      COMPLETED: ["هذه الجلسة مكتملة بالفعل.", "This session is already completed."],
    };
    const [ar, en] = messages[appointment.status] ?? [
      "لا يمكن رفع إيصال لهذا الحجز في حالته الحالية.",
      "A receipt cannot be uploaded for this appointment in its current state.",
    ];
    return failure("INVALID_STATE", ar, en);
  }

  // A lapsed hold is still recoverable as long as nobody else has claimed the
  // slot in the meantime - the lock key is the authority on that.
  if (
    appointment.status === "PENDING_PAYMENT_PROOF" &&
    appointment.holdExpiresAt &&
    appointment.holdExpiresAt.getTime() < Date.now() &&
    appointment.slotLockKey !== ACTIVE_SLOT_LOCK
  ) {
    return failure(
      "INVALID_STATE",
      "انتهت مهلة الدفع وتم تحرير الموعد لمريض آخر. يرجى اختيار موعد جديد.",
      "The payment window expired and the slot was released. Please book a new time.",
    );
  }

  if (appointment.scheduledAtUTC.getTime() < Date.now()) {
    return failure(
      "INVALID_STATE",
      "لا يمكن رفع إيصال لموعد مضى تاريخه.",
      "A receipt cannot be uploaded for an appointment in the past.",
    );
  }

  const file = formData.get("receipt");
  if (!(file instanceof File)) {
    return failure(
      "INVALID_FILE",
      RECEIPT_ERROR_MESSAGES.EMPTY.ar,
      RECEIPT_ERROR_MESSAGES.EMPTY.en,
      { receipt: RECEIPT_ERROR_MESSAGES.EMPTY.ar },
    );
  }

  const stored = await storeReceipt(file);
  if (!stored.ok) {
    const message = RECEIPT_ERROR_MESSAGES[stored.reason];
    return failure("INVALID_FILE", message.ar, message.en, { receipt: message.ar });
  }

  // The same screenshot submitted against a different booking is the obvious
  // abuse of a manual-verification flow, so it is blocked before it reaches the
  // desk. A resubmission on the SAME appointment is fine.
  const duplicate = await prisma.paymentProof.findFirst({
    where: { receiptSha256: stored.receipt.sha256, appointmentId: { not: appointmentId } },
    select: { id: true },
  });

  if (duplicate) {
    await deleteReceipt(stored.receipt.storageKey);
    return failure(
      "CONFLICT",
      "تم استخدام صورة هذا الإيصال من قبل في حجز آخر. يرجى رفع إيصال التحويل الخاص بهذا الحجز.",
      "This receipt image has already been used for another booking.",
      { receipt: "إيصال مستخدم من قبل" },
    );
  }

  let paymentProofId: string;

  try {
    // One transaction: the proof row and the status transition either both land
    // or neither does, so the desk can never see a receipt whose appointment is
    // still marked as awaiting one.
    const result = await prisma.$transaction(async (tx) => {
      const moved = await tx.appointment.updateMany({
        where: { id: appointmentId, status: appointment.status },
        data: {
          status: "PAYMENT_UNDER_REVIEW",
          // The slot is no longer on a countdown: a human now owns the decision.
          holdExpiresAt: null,
          slotLockKey: ACTIVE_SLOT_LOCK,
        },
      });

      if (moved.count === 0) {
        // Concurrent submit or an admin action changed the status underneath us.
        throw new Prisma.PrismaClientKnownRequestError("stale appointment state", {
          code: "P2025",
          clientVersion: Prisma.prismaVersion.client,
        });
      }

      return tx.paymentProof.create({
        data: {
          appointmentId,
          method: method as PaymentMethod,
          senderIdentifier,
          transactionRef,
          amountClaimedEGP:
            amountClaimedEGP !== undefined ? new Prisma.Decimal(amountClaimedEGP) : null,
          receiptImageUrl: stored.receipt.storageKey,
          receiptMimeType: stored.receipt.mimeType,
          receiptSizeBytes: stored.receipt.sizeBytes,
          receiptSha256: stored.receipt.sha256,
          status: "UNDER_REVIEW",
        },
        select: { id: true },
      });
    });

    paymentProofId = result.id;
  } catch (error) {
    // Roll the filesystem back to match the database.
    await deleteReceipt(stored.receipt.storageKey);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return failure(
        "CONFLICT",
        "تغيّرت حالة الحجز أثناء رفع الإيصال. يرجى تحديث الصفحة والمحاولة مرة أخرى.",
        "The appointment status changed while uploading. Please refresh and try again.",
      );
    }

    console.error("[payment] failed to record payment proof", error);
    return Failures.internal();
  }

  await recordAudit({
    actorId: user.id,
    action: "PAYMENT_PROOF_SUBMITTED",
    entityType: "PaymentProof",
    entityId: paymentProofId,
    metadata: { appointmentId, method, amountClaimedEGP: amountClaimedEGP ?? null },
  });

  const clinic = getClinicConfig();

  revalidatePath("/dashboard/patient");
  revalidatePath("/dashboard/admin/verification");

  return success({
    paymentProofId,
    appointmentId,
    status: "PAYMENT_UNDER_REVIEW",
    adminAlertWhatsappUrl: adminVerificationAlertLink({
      adminPhone: clinic.whatsappNumber,
      patientName: user.fullName,
      doctorName: appointment.doctor.user.fullName,
      scheduledAtUTC: appointment.scheduledAtUTC,
      method,
      senderIdentifier,
      amountClaimedEGP: amountClaimedEGP ?? null,
      reviewUrl: `${env.APP_URL}/dashboard/admin/verification?proof=${paymentProofId}`,
    }),
  });
}

// ---------------------------------------------------------------------------
// Admin: the verification queue
// ---------------------------------------------------------------------------

export interface PendingPaymentRow {
  paymentProofId: string;
  appointmentId: string;
  uploadedAtUTC: string;
  method: PaymentMethod;
  senderIdentifier: string;
  transactionRef: string | null;
  amountClaimedEGP: number | null;
  /** Authorised, non-public URL for the receipt image. */
  receiptUrl: string;
  receiptMimeType: string;
  patient: { id: string; fullName: string; phone: string; email: string };
  doctor: { id: string; fullName: string; roomNumber: string | null };
  appointment: {
    type: "ONLINE" | "OFFLINE";
    scheduledAtUTC: string;
    durationMinutes: number;
    priceEGP: number;
    status: string;
    hasZoomLink: boolean;
    rescheduledFromUTC: string | null;
    rescheduledAtUTC: string | null;
  };
  /** True when the declared amount does not match the frozen session price. */
  amountMismatch: boolean;
}

/**
 * Everything waiting on the Admin Verification Desk, oldest first so the queue
 * is worked first-in-first-out and no patient is left waiting the longest.
 */
export async function getPendingPaymentsAction(): Promise<ActionResult<PendingPaymentRow[]>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  const proofs = await prisma.paymentProof.findMany({
    where: { status: "UNDER_REVIEW" },
    orderBy: { uploadedAt: "asc" },
    take: 200,
    select: {
      id: true,
      appointmentId: true,
      uploadedAt: true,
      method: true,
      senderIdentifier: true,
      transactionRef: true,
      amountClaimedEGP: true,
      receiptMimeType: true,
      appointment: {
        select: {
          type: true,
          status: true,
          scheduledAtUTC: true,
          durationMinutes: true,
          priceEGP: true,
          zoomMeetingUrl: true,
          rescheduledFromUTC: true,
          rescheduledAt: true,
          patient: { select: { id: true, fullName: true, phone: true, email: true } },
          doctor: {
            select: { id: true, roomNumber: true, user: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  return success(
    proofs.map((proof) => {
      const priceEGP = toEgp(proof.appointment.priceEGP);
      const claimed = proof.amountClaimedEGP ? toEgp(proof.amountClaimedEGP) : null;

      return {
        paymentProofId: proof.id,
        appointmentId: proof.appointmentId,
        uploadedAtUTC: proof.uploadedAt.toISOString(),
        method: asPaymentMethod(proof.method),
        senderIdentifier: proof.senderIdentifier,
        transactionRef: proof.transactionRef,
        amountClaimedEGP: claimed,
        receiptUrl: `/api/receipts/${proof.id}`,
        receiptMimeType: proof.receiptMimeType,
        patient: proof.appointment.patient,
        doctor: {
          id: proof.appointment.doctor.id,
          fullName: proof.appointment.doctor.user.fullName,
          roomNumber: proof.appointment.doctor.roomNumber,
        },
        appointment: {
          type: asAppointmentType(proof.appointment.type),
          scheduledAtUTC: proof.appointment.scheduledAtUTC.toISOString(),
          durationMinutes: proof.appointment.durationMinutes,
          priceEGP,
          status: proof.appointment.status,
          hasZoomLink: Boolean(proof.appointment.zoomMeetingUrl),
          rescheduledFromUTC: proof.appointment.rescheduledFromUTC
            ? proof.appointment.rescheduledFromUTC.toISOString()
            : null,
          rescheduledAtUTC: proof.appointment.rescheduledAt
            ? proof.appointment.rescheduledAt.toISOString()
            : null,
        },
        amountMismatch: claimed !== null && claimed !== priceEGP,
      };
    }),
  );
}

/** Counter for the admin navigation badge. */
export async function getPendingPaymentsCountAction(): Promise<ActionResult<number>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  const count = await prisma.paymentProof.count({ where: { status: "UNDER_REVIEW" } });
  return success(count);
}
