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
  availabilityQuerySchema,
  cancelAppointmentSchema,
  patientRescheduleSchema,
  reserveSlotSchema,
  toFieldErrors,
} from "@/lib/validation/schemas";
import { requireRole } from "@/lib/auth/guards";
import { getAuthContext } from "@/lib/auth/session";
import { consumeRateLimit, RateLimits } from "@/lib/security/rate-limit";
import { recordAudit } from "@/lib/security/audit";
import { ACTIVE_SLOT_LOCK, PAYMENT_REVIEW_SLA_HOURS } from "@/lib/constants";
import { bookingPolicy, getClinicConfig } from "@/lib/clinic-config";
import { env } from "@/lib/env";
import { toEgp } from "@/lib/serialization";
import {
  BookableSlot,
  generateSlots,
  isSlotOffered,
  parseUtcDate,
  startOfUtcDay,
} from "@/lib/slots";
import {
  appointmentRescheduledLink,
  paymentInstructionsLink,
  buildWhatsAppLink,
} from "@/lib/whatsapp";

/**
 * Booking engine.
 *
 * Concurrency model - the part that matters most here:
 *
 * Two patients can click the same 5 p.m. slot in the same millisecond. Checking
 * "is this slot free?" and then inserting is a classic time-of-check /
 * time-of-use gap: both reads see a free slot, both insert, the doctor is
 * double-booked. Application-level locking cannot close it, and neither can a
 * transaction at the default isolation level, because there is no existing row
 * to lock.
 *
 * So the guarantee is delegated to the database:
 *   @@unique([doctorId, scheduledAtUTC, slotLockKey])
 * with `slotLockKey = "ACTIVE"` on every live appointment. The second INSERT
 * loses with P2002 and that patient is told the slot has just gone, rather than
 * both being confirmed. The pre-flight availability check that runs first is a
 * UX nicety, not the safety mechanism.
 *
 * Releasing a slot never deletes the row: `slotLockKey` is rewritten to the
 * appointment's own id, which is unique, freeing the (doctor, instant, ACTIVE)
 * tuple while the cancelled appointment stays on the patient's record.
 */

/** A patient may hold at most this many unpaid reservations at once. */
const MAX_CONCURRENT_HOLDS = 3;

const MINUTE_MS = 60_000;

// ---------------------------------------------------------------------------
// Read: available slots
// ---------------------------------------------------------------------------

export interface DoctorSlotsPayload {
  doctorId: string;
  doctorName: string;
  doctorTitle: string;
  type: "ONLINE" | "OFFLINE";
  priceEGP: number;
  roomNumber: string | null;
  slots: BookableSlot[];
  holdMinutes: number;
}

/**
 * Publish bookable slots for a doctor. Readable without a session so patients can
 * browse the calendar before registering; nothing sensitive is exposed.
 */
export async function getAvailableSlotsAction(input: {
  doctorId: string;
  type: "ONLINE" | "OFFLINE";
  fromDate?: string;
  days?: number;
}): Promise<ActionResult<DoctorSlotsPayload>> {
  const parsed = availabilityQuerySchema.safeParse(input);
  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات البحث عن المواعيد غير صالحة.",
      "Invalid availability query.",
      toFieldErrors(parsed.error),
    );
  }

  const { doctorId, type, fromDate, days } = parsed.data;

  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    select: {
      id: true,
      title: true,
      roomNumber: true,
      isAcceptingPatients: true,
      sessionPriceOnline: true,
      sessionPriceOffline: true,
      user: { select: { fullName: true, isActive: true } },
      availability: {
        where: { isActive: true },
        select: {
          id: true,
          dayOfWeek: true,
          startMinutesUTC: true,
          endMinutesUTC: true,
          slotDurationMins: true,
          isOnlineAvailable: true,
          isOfflineAvailable: true,
          isActive: true,
          effectiveFrom: true,
          effectiveUntil: true,
        },
      },
    },
  });

  if (!doctor || !doctor.user.isActive) {
    return Failures.notFound("الطبيب المطلوب");
  }

  const now = new Date();
  const windowStart = fromDate ? parseUtcDate(fromDate) : startOfUtcDay(now);
  if (!windowStart) {
    return failure("VALIDATION_ERROR", "تاريخ البداية غير صالح.", "Invalid start date.");
  }

  const horizonDays = Math.min(days ?? bookingPolicy.horizonDays, bookingPolicy.horizonDays);
  const windowEnd = new Date(windowStart.getTime() + horizonDays * 24 * 60 * MINUTE_MS);

  const [exceptions, busyAppointments] = await Promise.all([
    prisma.availabilityException.findMany({
      where: {
        doctorId,
        cancelledAt: null,
        endsAtUTC: { gt: windowStart },
        startsAtUTC: { lt: windowEnd },
      },
      select: { startsAtUTC: true, endsAtUTC: true },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        status: { in: [...OCCUPYING_STATUSES] },
        scheduledAtUTC: { gte: new Date(windowStart.getTime() - 4 * 60 * MINUTE_MS), lt: windowEnd },
        // An unpaid hold that has already lapsed no longer blocks the slot; it is
        // formally released the moment someone tries to book over it.
        OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }],
      },
      select: { scheduledAtUTC: true, durationMinutes: true },
    }),
  ]);

  const slots = doctor.isAcceptingPatients
    ? generateSlots({
        rules: doctor.availability,
        exceptions: exceptions.map((gap) => ({
          startUTC: gap.startsAtUTC,
          endUTC: gap.endsAtUTC,
        })),
        busy: busyAppointments.map((appointment) => ({
          startUTC: appointment.scheduledAtUTC,
          endUTC: new Date(
            appointment.scheduledAtUTC.getTime() + appointment.durationMinutes * MINUTE_MS,
          ),
        })),
        type,
        from: windowStart,
        days: horizonDays,
        now,
        minNoticeMinutes: bookingPolicy.minNoticeMinutes,
      })
    : [];

  return success({
    doctorId: doctor.id,
    doctorName: doctor.user.fullName,
    doctorTitle: doctor.title,
    type,
    priceEGP: toEgp(type === "ONLINE" ? doctor.sessionPriceOnline : doctor.sessionPriceOffline),
    roomNumber: type === "OFFLINE" ? doctor.roomNumber : null,
    slots,
    holdMinutes: bookingPolicy.holdMinutes,
  });
}

// ---------------------------------------------------------------------------
// Write: reserve a slot
// ---------------------------------------------------------------------------

export interface ReservationPayload {
  appointmentId: string;
  status: AppointmentStatus;
  scheduledAtUTC: string;
  durationMinutes: number;
  type: "ONLINE" | "OFFLINE";
  priceEGP: number;
  doctorName: string;
  holdExpiresAtUTC: string | null;
  paymentInstructions: {
    instapayHandle: string;
    vodafoneCashNumbers: string[];
    amountEGP: number;
    holdMinutes: number;
  } | null;
  /** Pre-filled WhatsApp message with the payment instructions, to the patient. */
  whatsappInstructionsUrl: string;
  /** Pre-filled WhatsApp message to the clinic, for a patient who needs help. */
  whatsappClinicUrl: string;
  uploadUrl: string;
}

/**
 * Step 1 of the manual payment flow: hold the slot and create the appointment in
 * `PENDING_PAYMENT_PROOF`.
 */
export async function reserveSlotAction(
  _prevState: ActionResult<ReservationPayload> | null,
  formData: FormData,
): Promise<ActionResult<ReservationPayload>> {
  const guard = await requireRole(["PATIENT"], formData);
  if (!guard.ok) return guard;
  const { user } = guard.data;

  const throttle = consumeRateLimit(`booking:${user.id}`, RateLimits.booking);
  if (!throttle.allowed) return Failures.rateLimited(throttle.retryAfterSeconds);

  const parsed = reserveSlotSchema.safeParse({
    doctorId: formData.get("doctorId"),
    type: formData.get("type"),
    scheduledAtUTC: formData.get("scheduledAtUTC"),
    durationMinutes: formData.get("durationMinutes"),
    applyCredit: formData.get("applyCredit"),
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات الحجز غير مكتملة أو غير صالحة.",
      "The booking details are incomplete or invalid.",
      toFieldErrors(parsed.error),
    );
  }

  const { doctorId, type, scheduledAtUTC, durationMinutes, applyCredit } = parsed.data;
  const now = new Date();

  // The published calendar is re-derived below starting from the requested day,
  // so without this check a crafted request could book past the horizon the
  // clinic actually publishes.
  const horizonEnd = new Date(now.getTime() + bookingPolicy.horizonDays * 24 * 60 * MINUTE_MS);
  if (scheduledAtUTC.getTime() > horizonEnd.getTime()) {
    return failure(
      "VALIDATION_ERROR",
      `الحجز متاح لمدة ${bookingPolicy.horizonDays} يوماً مقدماً فقط.`,
      `Bookings can only be made up to ${bookingPolicy.horizonDays} days in advance.`,
    );
  }

  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    select: {
      id: true,
      roomNumber: true,
      isAcceptingPatients: true,
      sessionPriceOnline: true,
      sessionPriceOffline: true,
      user: { select: { fullName: true, isActive: true } },
    },
  });

  if (!doctor || !doctor.user.isActive) return Failures.notFound("الطبيب المطلوب");
  if (!doctor.isAcceptingPatients) {
    return failure(
      "CONFLICT",
      "هذا الطبيب لا يستقبل حجوزات جديدة حالياً.",
      "This doctor is not accepting new bookings at the moment.",
    );
  }

  // Slot squatting guard: a patient cannot tie up the whole calendar with
  // reservations they never pay for.
  const openHolds = await prisma.appointment.count({
    where: {
      patientId: user.id,
      status: "PENDING_PAYMENT_PROOF",
      slotLockKey: ACTIVE_SLOT_LOCK,
      holdExpiresAt: { gt: now },
    },
  });
  if (openHolds >= MAX_CONCURRENT_HOLDS) {
    return failure(
      "CONFLICT",
      `لديك ${openHolds} حجوزات بانتظار الدفع. يرجى استكمال الدفع أو إلغاء أحدها قبل حجز موعد جديد.`,
      `You already have ${openHolds} reservations awaiting payment. Please complete or cancel one first.`,
    );
  }

  // The patient must not be booked with two doctors at the same time.
  const slotEnd = new Date(scheduledAtUTC.getTime() + durationMinutes * MINUTE_MS);
  const patientClash = await prisma.appointment.findFirst({
    where: {
      patientId: user.id,
      status: { in: [...OCCUPYING_STATUSES] },
      scheduledAtUTC: { lt: slotEnd, gt: new Date(scheduledAtUTC.getTime() - 4 * 60 * MINUTE_MS) },
      OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }],
    },
    select: { id: true, scheduledAtUTC: true, durationMinutes: true },
  });

  if (
    patientClash &&
    patientClash.scheduledAtUTC.getTime() +
      patientClash.durationMinutes * MINUTE_MS >
      scheduledAtUTC.getTime()
  ) {
    return failure(
      "CONFLICT",
      "لديك موعد آخر في نفس التوقيت. يرجى اختيار وقت مختلف.",
      "You already have another appointment at this time.",
    );
  }

  // Re-derive the published calendar and confirm the requested instant is really
  // on it, so a hand-crafted POST cannot book 03:00 or a mid-appointment offset.
  const offered = await getAvailableSlotsAction({
    doctorId,
    type,
    fromDate: scheduledAtUTC.toISOString().slice(0, 10),
    days: 2,
  });
  if (!offered.ok) return offered;

  if (!isSlotOffered(offered.data.slots, scheduledAtUTC, durationMinutes)) {
    return failure(
      "SLOT_TAKEN",
      "هذا الموعد لم يعد متاحاً. يرجى اختيار موعد آخر من المواعيد المتاحة.",
      "That slot is no longer available. Please choose another time.",
    );
  }

  // Reclaim a lapsed hold occupying this exact instant. The unique index means
  // there is at most one such row, so a single targeted update is sufficient.
  const lapsedHold = await prisma.appointment.findFirst({
    where: {
      doctorId,
      scheduledAtUTC,
      slotLockKey: ACTIVE_SLOT_LOCK,
      status: "PENDING_PAYMENT_PROOF",
      holdExpiresAt: { lt: now },
    },
    select: { id: true, patientId: true },
  });

  if (lapsedHold) {
    // Conditional update: if a concurrent request already reclaimed it, `count`
    // comes back 0 and the INSERT below simply loses the race instead.
    const released = await prisma.appointment.updateMany({
      where: { id: lapsedHold.id, slotLockKey: ACTIVE_SLOT_LOCK, status: "PENDING_PAYMENT_PROOF" },
      data: { status: "EXPIRED", slotLockKey: lapsedHold.id },
    });
    if (released.count > 0) {
      await recordAudit({
        actorId: null,
        action: "HOLD_EXPIRED_RECLAIMED",
        entityType: "Appointment",
        entityId: lapsedHold.id,
        metadata: { previousPatientId: lapsedHold.patientId },
      });
    }
  }

  const priceEGP = toEgp(
    type === "ONLINE" ? doctor.sessionPriceOnline : doctor.sessionPriceOffline,
  );

  // Credit-covered booking execution (Option A)
  if (applyCredit) {
    try {
      const outcome = await prisma.$transaction(
        async (tx) => {
          // Re-calculate balance inside Serializable transaction
          const credits = await tx.patientCredit.findMany({
            where: { patientId: user.id },
          });

          let currentBalance = new Prisma.Decimal(0);
          for (const c of credits) {
            currentBalance = currentBalance.add(c.amountEGP);
          }

          if (currentBalance.lt(priceEGP)) {
            throw new Error("INSUFFICIENT_CREDIT");
          }

          const appointment = await tx.appointment.create({
            data: {
              patientId: user.id,
              doctorId,
              type,
              scheduledAtUTC,
              durationMinutes,
              status: type === "ONLINE" ? "PAYMENT_UNDER_REVIEW" : "CONFIRMED",
              priceEGP: new Prisma.Decimal(priceEGP),
              slotLockKey: ACTIVE_SLOT_LOCK,
              holdExpiresAt: null,
            },
            select: { id: true },
          });

          // Ledger deduction
          await tx.patientCredit.create({
            data: {
              patientId: user.id,
              appointmentId: appointment.id,
              amountEGP: new Prisma.Decimal(priceEGP).negated(),
              kind: "APPLIED_TO_BOOKING",
              reason: `استخدام الرصيد لحجز جلسة ${type === "ONLINE" ? "أونلاين" : "حضوري"} مع ${doctor.user.fullName}`,
              issuedById: user.id,
            },
          });

          // PaymentProof row (F13: ONLINE sessions enter UNDER_REVIEW so admin attaches Zoom link)
          await tx.paymentProof.create({
            data: {
              appointmentId: appointment.id,
              method: "CREDIT",
              senderIdentifier: user.phone,
              transactionRef: `CREDIT-${appointment.id}`,
              amountClaimedEGP: new Prisma.Decimal(priceEGP),
              receiptImageUrl: "SYSTEM_CREDIT",
              receiptMimeType: "application/system",
              receiptSizeBytes: 0,
              receiptSha256: `SYSTEM_CREDIT_${appointment.id}`,
              status: type === "ONLINE" ? "UNDER_REVIEW" : "APPROVED",
              reviewedAt: type === "OFFLINE" ? now : null,
              reviewedById: null, // System auto-approved; prevents attributing review to the patient (F18)
            },
          });

          return appointment;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      await recordAudit({
        actorId: user.id,
        action: "APPOINTMENT_RESERVED",
        entityType: "Appointment",
        entityId: outcome.id,
        metadata: {
          doctorId,
          type,
          priceEGP,
          scheduledAtUTC: scheduledAtUTC.toISOString(),
          paymentMethod: "CREDIT",
        },
      });

      revalidatePath("/dashboard/patient");
      revalidatePath(`/booking/${doctorId}`);
      revalidatePath("/dashboard/admin/verification");

      const clinic = getClinicConfig();
      const uploadUrl = `${env.APP_URL}/payment/${outcome.id}`;
      const clinicWhatsapp = buildWhatsAppLink(
        clinic.whatsappNumber,
        `مرحباً، قمت بحجز موعد باستخدام رصيدي المالي لدى المركز. رقم الحجز: ${outcome.id}`,
      );

      return success({
        appointmentId: outcome.id,
        status: (type === "ONLINE" ? "PAYMENT_UNDER_REVIEW" : "CONFIRMED") as AppointmentStatus,
        scheduledAtUTC: scheduledAtUTC.toISOString(),
        durationMinutes,
        type,
        priceEGP,
        doctorName: doctor.user.fullName,
        holdExpiresAtUTC: null,
        paymentInstructions: null,
        whatsappInstructionsUrl: "",
        whatsappClinicUrl: clinicWhatsapp,
        uploadUrl,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_CREDIT") {
        return failure(
          "INVALID_STATE",
          "رصيدك المالي المتاح لدى المركز غير كافٍ لتغطية قيمة الجلسة. يرجى إتمام الحجز بالدفع اليدوي.",
          "Your available credit balance is insufficient to cover this booking.",
        );
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return failure(
          "SLOT_TAKEN",
          "تم حجز هذا الموعد للتو من مريض آخر. يرجى اختيار موعد بديل.",
          "This slot was just taken by another patient. Please pick another time.",
        );
      }
      console.error("[booking] credit reservation failed", error);
      return Failures.internal();
    }
  }

  const holdExpiresAt = new Date(now.getTime() + bookingPolicy.holdMinutes * MINUTE_MS);

  let appointmentId: string;
  try {
    const appointment = await prisma.appointment.create({
      data: {
        patientId: user.id,
        doctorId,
        type,
        scheduledAtUTC,
        durationMinutes,
        status: "PENDING_PAYMENT_PROOF",
        priceEGP: new Prisma.Decimal(priceEGP),
        slotLockKey: ACTIVE_SLOT_LOCK,
        holdExpiresAt,
      },
      select: { id: true },
    });
    appointmentId = appointment.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Someone else won the race between our availability read and this insert.
      return failure(
        "SLOT_TAKEN",
        "تم حجز هذا الموعد للتو من مريض آخر. يرجى اختيار موعد بديل.",
        "This slot was just taken by another patient. Please pick another time.",
      );
    }
    console.error("[booking] reservation failed", error);
    return Failures.internal();
  }

  await recordAudit({
    actorId: user.id,
    action: "APPOINTMENT_RESERVED",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: { doctorId, type, priceEGP, scheduledAtUTC: scheduledAtUTC.toISOString() },
  });

  const clinic = getClinicConfig();
  const uploadUrl = `${env.APP_URL}/payment/${appointmentId}`;

  revalidatePath("/dashboard/patient");
  revalidatePath(`/booking/${doctorId}`);

  return success({
    appointmentId,
    status: "PENDING_PAYMENT_PROOF",
    scheduledAtUTC: scheduledAtUTC.toISOString(),
    durationMinutes,
    type,
    priceEGP,
    doctorName: doctor.user.fullName,
    holdExpiresAtUTC: holdExpiresAt.toISOString(),
    paymentInstructions: {
      instapayHandle: clinic.instapayHandle,
      vodafoneCashNumbers: clinic.vodafoneCashNumbers,
      amountEGP: priceEGP,
      holdMinutes: clinic.holdMinutes,
    },
    whatsappInstructionsUrl: paymentInstructionsLink({
      patientName: user.fullName,
      patientPhone: user.phone,
      doctorName: doctor.user.fullName,
      scheduledAtUTC,
      type,
      priceEGP,
      instapayHandle: clinic.instapayHandle,
      vodafoneCashNumbers: clinic.vodafoneCashNumbers,
      holdMinutes: clinic.holdMinutes,
      uploadUrl,
    }),
    whatsappClinicUrl: buildWhatsAppLink(
      clinic.whatsappNumber,
      `مرحباً، أنا ${user.fullName}. حجزت موعداً مع ${doctor.user.fullName} ` +
        `وأحتاج مساعدة بخصوص إتمام الدفع (رقم الحجز: ${appointmentId}).`,
    ),
    uploadUrl,
  });
}

// ---------------------------------------------------------------------------
// Read: my appointments
// ---------------------------------------------------------------------------

export interface PatientAppointmentView {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorTitle: string;
  type: "ONLINE" | "OFFLINE";
  status: AppointmentStatus;
  scheduledAtUTC: string;
  durationMinutes: number;
  priceEGP: number;
  zoomMeetingUrl: string | null;
  zoomPasscode: string | null;
  clinicNotes: string | null;
  roomNumber: string | null;
  holdExpiresAtUTC: string | null;
  latestRejectionReason: string | null;
  canUploadProof: boolean;
  canCancel: boolean;
  canReschedule: boolean;
  rescheduledFromUTC: string | null;
}

export async function getMyAppointmentsAction(): Promise<ActionResult<PatientAppointmentView[]>> {
  const auth = await getAuthContext();
  if (!auth) return Failures.unauthenticated();

  const appointments = await prisma.appointment.findMany({
    where: { patientId: auth.user.id },
    orderBy: { scheduledAtUTC: "desc" },
    take: 100,
    select: {
      id: true,
      doctorId: true,
      type: true,
      status: true,
      scheduledAtUTC: true,
      durationMinutes: true,
      priceEGP: true,
      zoomMeetingUrl: true,
      zoomPasscode: true,
      clinicNotes: true,
      holdExpiresAt: true,
      rescheduledFromUTC: true,
      rescheduledById: true,
      patientRescheduleCount: true,
      doctor: {
        select: { id: true, title: true, roomNumber: true, user: { select: { fullName: true } } },
      },
      paymentProofs: {
        orderBy: { uploadedAt: "desc" },
        take: 1,
        select: { status: true, rejectionReason: true },
      },
    },
  });

  const now = Date.now();

  return success(
    appointments.map((appointment) => {
      const latestProof = appointment.paymentProofs[0];
      const holdActive =
        !appointment.holdExpiresAt || appointment.holdExpiresAt.getTime() > now;

      const canReschedule =
        appointment.status === "CONFIRMED" &&
        appointment.scheduledAtUTC.getTime() > now + 24 * 60 * MINUTE_MS &&
        appointment.patientRescheduleCount < 1;

      return {
        id: appointment.id,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctor.user.fullName,
        doctorTitle: appointment.doctor.title,
        type: asAppointmentType(appointment.type),
        status: asAppointmentStatus(appointment.status),
        scheduledAtUTC: appointment.scheduledAtUTC.toISOString(),
        durationMinutes: appointment.durationMinutes,
        priceEGP: toEgp(appointment.priceEGP),
        zoomMeetingUrl: appointment.zoomMeetingUrl,
        zoomPasscode: appointment.zoomPasscode,
        clinicNotes: appointment.clinicNotes,
        roomNumber: appointment.type === "OFFLINE" ? appointment.doctor.roomNumber : null,
        holdExpiresAtUTC: appointment.holdExpiresAt?.toISOString() ?? null,
        latestRejectionReason:
          latestProof?.status === "REJECTED" ? latestProof.rejectionReason : null,
        canUploadProof:
          (appointment.status === "PENDING_PAYMENT_PROOF" && holdActive) ||
          appointment.status === "REJECTED",
        canCancel:
          appointment.status === "PENDING_PAYMENT_PROOF" ||
          appointment.status === "PAYMENT_UNDER_REVIEW" ||
          (appointment.status === "CONFIRMED" &&
            appointment.scheduledAtUTC.getTime() > now + 12 * 60 * MINUTE_MS),
        canReschedule,
        rescheduledFromUTC: appointment.rescheduledFromUTC
          ? appointment.rescheduledFromUTC.toISOString()
          : null,
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// Write: patient cancels
// ---------------------------------------------------------------------------

export async function cancelMyAppointmentAction(
  _prevState: ActionResult<{ appointmentId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ appointmentId: string }>> {
  const guard = await requireRole(["PATIENT"], formData);
  if (!guard.ok) return guard;
  const { user } = guard.data;

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
    select: { id: true, patientId: true, status: true, scheduledAtUTC: true, doctorId: true },
  });

  if (!appointment) return Failures.notFound("الحجز المطلوب");
  // Ownership is checked on the row, not inferred from the request: an id from
  // another patient's record must not be cancellable.
  if (appointment.patientId !== user.id) return Failures.forbidden();

  if (!["PENDING_PAYMENT_PROOF", "PAYMENT_UNDER_REVIEW", "CONFIRMED"].includes(appointment.status)) {
    return failure(
      "INVALID_STATE",
      "لا يمكن إلغاء هذا الحجز في حالته الحالية.",
      "This appointment can no longer be cancelled.",
    );
  }

  if (
    appointment.status === "CONFIRMED" &&
    appointment.scheduledAtUTC.getTime() < Date.now() + 12 * 60 * MINUTE_MS
  ) {
    return failure(
      "INVALID_STATE",
      "لا يمكن الإلغاء قبل الموعد بأقل من 12 ساعة. يرجى التواصل مع إدارة المركز.",
      "Appointments cannot be cancelled less than 12 hours in advance. Please contact the clinic.",
    );
  }

  // TODO(policy): Patient-initiated cancellation does not auto-issue credit pending clinic policy decision
  // on refundable notice windows. Currently, only staff-initiated cancellations auto-issue credits.
  const updated = await prisma.appointment.updateMany({
    where: { id: appointmentId, status: appointment.status },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason ?? "ألغى المريض الحجز",
      // Free the slot without deleting the historical row.
      slotLockKey: appointmentId,
      holdExpiresAt: null,
    },
  });

  if (updated.count === 0) {
    return failure(
      "CONFLICT",
      "تم تحديث حالة الحجز بالفعل. يرجى تحديث الصفحة.",
      "This appointment was updated already. Please refresh.",
    );
  }

  await recordAudit({
    actorId: user.id,
    action: "APPOINTMENT_CANCELLED",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: { by: "PATIENT", previousStatus: appointment.status },
  });

  revalidatePath("/dashboard/patient");
  revalidatePath("/dashboard/admin/verification");

  return success({ appointmentId });
}

/**
 * Patient self-service reschedule.
 * Allows a patient to move their own CONFIRMED appointment to another published slot
 * for the same doctor, with a strict 24-hour advance notice window and 1-time limit.
 */
export async function patientRescheduleAppointmentAction(
  _prevState: ActionResult<{ appointmentId: string; whatsappRescheduleUrl: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ appointmentId: string; whatsappRescheduleUrl: string }>> {
  const guard = await requireRole(["PATIENT"], formData);
  if (!guard.ok) return guard;
  const { user } = guard.data;

  const parsed = patientRescheduleSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    scheduledAtUTC: formData.get("scheduledAtUTC"),
    durationMinutes: formData.get("durationMinutes"),
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات إعادة الجدولة غير صالحة.",
      "Invalid reschedule details.",
      toFieldErrors(parsed.error),
    );
  }

  const { appointmentId, scheduledAtUTC: targetInstant, durationMinutes } = parsed.data;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: { select: { id: true, roomNumber: true, user: { select: { fullName: true } } } },
      patient: { select: { id: true, fullName: true, phone: true } },
    },
  });

  if (!appointment) return Failures.notFound("الحجز المطلوب");

  // Ownership check: patient owns the appointment
  if (appointment.patientId !== user.id) return Failures.forbidden();

  // Only CONFIRMED sessions can be self-rescheduled
  if (appointment.status !== "CONFIRMED") {
    return failure(
      "INVALID_STATE",
      "يمكن إعادة جدولة المواعيد المؤكدة فقط. للمواعيد الأخرى يرجى مراجعة إدارة المركز.",
      "Only confirmed appointments can be rescheduled by the patient.",
    );
  }

  const now = new Date();

  // Strict 24-hour advance notice window
  const minNoticeThreshold = new Date(now.getTime() + 24 * 60 * MINUTE_MS);
  if (appointment.scheduledAtUTC.getTime() < minNoticeThreshold.getTime()) {
    return failure(
      "INVALID_STATE",
      "لا يمكن تغيير الموعد قبل الجلسة بأقل من 24 ساعة. يرجى التواصل مع إدارة المركز.",
      "Appointments cannot be rescheduled less than 24 hours in advance.",
    );
  }

  // Cap at 1 patient-initiated reschedule per appointment (F10)
  if (appointment.patientRescheduleCount >= 1) {
    return failure(
      "INVALID_STATE",
      "تمت إعادة جدولة هذا الموعد مسبقاً. يرجى التواصل مع إدارة العيادة لإجراء أي تعديل إضافي.",
      "This appointment has already been rescheduled once by the patient.",
    );
  }

  // Target instant validation
  if (targetInstant.getTime() <= now.getTime() + bookingPolicy.minNoticeMinutes * MINUTE_MS) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى اختيار موعد يبدأ بعد ساعتين على الأقل من الآن.",
      "Target time must be at least the minimum notice window in the future.",
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

  // Strictly on-grid published slot validation
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
      scheduledAtUTC: {
        gte: new Date(targetInstant.getTime() - 4 * 60 * MINUTE_MS),
        lte: new Date(targetInstant.getTime() + 4 * 60 * MINUTE_MS),
      },
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

  const oldScheduledAtUTC = appointment.scheduledAtUTC;

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        scheduledAtUTC: targetInstant,
        durationMinutes,
        rescheduledFromUTC: oldScheduledAtUTC,
        rescheduledAt: now,
        rescheduledById: user.id,
        rescheduleReason: "إعادة جدولة ذاتية من المريض",
        patientRescheduleCount: { increment: 1 },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure(
        "SLOT_TAKEN",
        "هذا الموعد حُجز للتو لمريض آخر. يرجى اختيار وقت بديل.",
        "That slot was just booked by another patient.",
      );
    }
    console.error("[patientReschedule] Database error:", error);
    return Failures.internal();
  }

  await recordAudit({
    actorId: user.id,
    action: "APPOINTMENT_RESCHEDULED",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: {
      fromUTC: oldScheduledAtUTC.toISOString(),
      toUTC: targetInstant.toISOString(),
      by: "PATIENT",
    },
  });

  revalidatePath("/dashboard/patient");
  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/admin/appointments");
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
    reason: "تعديل الموعد بناءً على طلبك",
  });

  return success({
    appointmentId,
    whatsappRescheduleUrl: whatsappUrl,
  });
}

export interface SlotView {
  startUTC: string;
  endUTC: string;
  durationMinutes: number;
  timeLabel: string;
  dateCairo: string;
}

/**
 * Sweep every way a slot can stay locked past its purpose:
 *  1. unpaid holds that lapsed before a receipt arrived,
 *  2. receipts that sat on the verification desk past the review SLA,
 *  3. rejection grace windows the patient never used.
 *
 * `releasedCount` is the total across all three; the other counters break it down.
 */
export async function releaseExpiredHoldsAction(): Promise<
  ActionResult<{ releasedCount: number; slaReclaimedCount: number; rejectionLocksReleased: number }>
> {
  const now = new Date();
  const graceThreshold = new Date(now.getTime() - 60_000); // 1 minute grace period for in-flight uploads

  // Pass 1: Lapsed unpaid holds (PENDING_PAYMENT_PROOF)
  const lapsedHolds = await prisma.appointment.findMany({
    where: {
      status: "PENDING_PAYMENT_PROOF",
      holdExpiresAt: { lt: graceThreshold },
      slotLockKey: ACTIVE_SLOT_LOCK,
    },
    select: { id: true },
    take: 500,
  });

  let releasedCount = 0;
  for (const app of lapsedHolds) {
    const updated = await prisma.appointment.updateMany({
      where: { id: app.id, status: "PENDING_PAYMENT_PROOF", slotLockKey: ACTIVE_SLOT_LOCK },
      data: {
        status: "EXPIRED",
        slotLockKey: app.id,
        holdExpiresAt: null,
      },
    });
    releasedCount += updated.count;
  }

  // Pass 2: Stale review holds (PAYMENT_UNDER_REVIEW past SLA, A1 fix).
  //
  // The SLA is measured from when the receipt currently awaiting review was
  // uploaded, NOT from `appointment.createdAt`. A rejected receipt can be
  // resubmitted (payment.actions.ts accepts a new proof on a REJECTED booking),
  // which returns an old appointment to PAYMENT_UNDER_REVIEW with a brand-new
  // receipt. Keying the SLA off `createdAt` would reclaim that slot on the very
  // next cron tick while the patient's fresh receipt sat unreviewed.
  const slaThreshold = new Date(now.getTime() - PAYMENT_REVIEW_SLA_HOURS * 60 * 60 * 1000);
  const staleUnderReview = await prisma.appointment.findMany({
    where: {
      status: "PAYMENT_UNDER_REVIEW",
      slotLockKey: ACTIVE_SLOT_LOCK,
      // At least one receipt has been waiting longer than the SLA...
      paymentProofs: { some: { status: "UNDER_REVIEW", uploadedAt: { lt: slaThreshold } } },
      // ...and none was uploaded recently enough to restart the clock.
      NOT: {
        paymentProofs: { some: { status: "UNDER_REVIEW", uploadedAt: { gte: slaThreshold } } },
      },
    },
    select: {
      id: true,
      paymentProofs: {
        where: { status: "UNDER_REVIEW" },
        orderBy: { uploadedAt: "desc" },
        select: { id: true },
        take: 1,
      },
    },
    take: 500,
  });

  let slaReclaimedCount = 0;
  for (const app of staleUnderReview) {
    const updated = await prisma.appointment.updateMany({
      where: { id: app.id, status: "PAYMENT_UNDER_REVIEW", slotLockKey: ACTIVE_SLOT_LOCK },
      data: {
        status: "EXPIRED",
        slotLockKey: app.id,
        holdExpiresAt: null,
      },
    });
    if (updated.count > 0) {
      slaReclaimedCount += updated.count;
      await recordAudit({
        actorId: null,
        action: "HOLD_EXPIRED_RECLAIMED",
        entityType: "Appointment",
        entityId: app.id,
        metadata: {
          reason: "UNDER_REVIEW_SLA_EXPIRED",
          paymentProofId: app.paymentProofs[0]?.id ?? null,
        },
      });
    }
  }

  // Pass 3: Lapsed rejection grace windows.
  //
  // `rejectPaymentAction` keeps a future session on ACTIVE_SLOT_LOCK with a
  // `holdExpiresAt` grace deadline so the patient can replace a blurry receipt
  // without losing the slot. REJECTED is not in OCCUPYING_STATUSES, so once that
  // deadline passes the availability query reports the slot as free while the
  // `(doctorId, scheduledAtUTC, slotLockKey)` unique index still refuses a new
  // booking — the slot looks bookable and then fails with SLOT_TAKEN forever.
  // Releasing the lock costs nothing: the REJECTED row is retained as the record
  // of what happened, it simply stops occupying the tuple.
  const lapsedRejections = await prisma.appointment.findMany({
    where: {
      status: "REJECTED",
      slotLockKey: ACTIVE_SLOT_LOCK,
      holdExpiresAt: { lt: graceThreshold },
    },
    select: { id: true },
    take: 500,
  });

  let rejectionLocksReleased = 0;
  for (const app of lapsedRejections) {
    const updated = await prisma.appointment.updateMany({
      where: { id: app.id, status: "REJECTED", slotLockKey: ACTIVE_SLOT_LOCK },
      data: {
        slotLockKey: app.id,
        holdExpiresAt: null,
      },
    });
    if (updated.count > 0) {
      rejectionLocksReleased += updated.count;
      await recordAudit({
        actorId: null,
        action: "HOLD_EXPIRED_RECLAIMED",
        entityType: "Appointment",
        entityId: app.id,
        metadata: { reason: "REJECTION_GRACE_EXPIRED" },
      });
    }
  }

  const total = releasedCount + slaReclaimedCount + rejectionLocksReleased;
  if (total > 0) {
    revalidatePath("/dashboard/admin/verification");
    revalidatePath("/dashboard/admin/appointments");
  }

  return success({ releasedCount: total, slaReclaimedCount, rejectionLocksReleased });
}
