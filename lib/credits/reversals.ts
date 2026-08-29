import { Prisma } from "@prisma/client";

export interface ReversalResult {
  reversed: boolean;
  amountEGP: number;
}

/**
 * Idempotently reverses any patient credit applied to an appointment.
 *
 * Invariant:
 * Credit is deducted at booking (kind: "APPLIED_TO_BOOKING"). If the booking is
 * cancelled, expired, or rejected before completion, the deducted credit MUST be
 * returned as a positive row (kind: "CREDIT_REVERSAL"), exactly once.
 *
 * Algorithm:
 * 1. Reads all PatientCredit rows for the appointment.
 * 2. Sums all APPLIED_TO_BOOKING deductions (stored as negative amounts).
 * 3. Sums all already-written CREDIT_REVERSAL rows.
 * 4. toReverse = applied - alreadyReversed.
 * 5. Writes toReverse as a positive CREDIT_REVERSAL ONLY if toReverse > 0.
 *
 * Must commit inside the same transaction as the appointment status change.
 */
export async function reverseAppliedCredit(
  tx: Prisma.TransactionClient,
  input: {
    appointmentId: string;
    patientId: string;
    actorId?: string | null;
    reason: string;
  },
): Promise<ReversalResult> {
  const credits = await tx.patientCredit.findMany({
    where: { appointmentId: input.appointmentId },
  });

  let applied = new Prisma.Decimal(0);
  let alreadyReversed = new Prisma.Decimal(0);

  for (const c of credits) {
    if (c.kind === "APPLIED_TO_BOOKING") {
      applied = applied.add(c.amountEGP.abs());
    } else if (c.kind === "CREDIT_REVERSAL") {
      alreadyReversed = alreadyReversed.add(c.amountEGP);
    }
  }

  const toReverse = applied.sub(alreadyReversed);

  if (toReverse.lte(0)) {
    return { reversed: false, amountEGP: 0 };
  }

  await tx.patientCredit.create({
    data: {
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      amountEGP: toReverse,
      kind: "CREDIT_REVERSAL",
      reason: input.reason,
      issuedById: input.actorId ?? null,
    },
  });

  return { reversed: true, amountEGP: toReverse.toNumber() };
}

/**
 * Computes the credit deduction and cash actually taken for an appointment.
 * Used for refund-by-source on staff cancellation.
 */
export async function getAppointmentFinancialBreakdown(
  tx: Prisma.TransactionClient,
  appointmentId: string,
  priceEGP: Prisma.Decimal,
): Promise<{
  creditAppliedEGP: Prisma.Decimal;
  cashActuallyTakenEGP: Prisma.Decimal;
  hasApprovedCashProof: boolean;
}> {
  const [credits, approvedProof] = await Promise.all([
    tx.patientCredit.findMany({
      where: { appointmentId, kind: "APPLIED_TO_BOOKING" },
    }),
    tx.paymentProof.findFirst({
      where: {
        appointmentId,
        status: "APPROVED",
        method: { not: "CREDIT" },
      },
    }),
  ]);

  let creditApplied = new Prisma.Decimal(0);
  for (const c of credits) {
    creditApplied = creditApplied.add(c.amountEGP.abs());
  }

  const cashPortion = priceEGP.sub(creditApplied);
  const cashActuallyTaken =
    approvedProof && cashPortion.gt(0) ? cashPortion : new Prisma.Decimal(0);

  return {
    creditAppliedEGP: creditApplied,
    cashActuallyTakenEGP: cashActuallyTaken,
    hasApprovedCashProof: Boolean(approvedProof),
  };
}
