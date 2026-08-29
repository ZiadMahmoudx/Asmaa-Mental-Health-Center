"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import { requireRole } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/security/audit";
import { issueManualCreditSchema, settleCreditSchema, toFieldErrors } from "@/lib/validation/schemas";
import { asCreditKind, type CreditKind } from "@/lib/domain/enums";
import { toEgp } from "@/lib/serialization";

export interface CreditLedgerEntry {
  id: string;
  patientId: string;
  appointmentId: string | null;
  amountEGP: number;
  kind: CreditKind;
  reason: string | null;
  issuedById: string | null;
  issuedByName?: string | null;
  settledAtUTC: string | null;
  settlementRef: string | null;
  createdAtUTC: string;
}

export interface PatientCreditSummary {
  patientId: string;
  patientName: string;
  patientPhone: string;
  balanceEGP: number;
  entries: CreditLedgerEntry[];
}

export interface OutstandingCreditRow {
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  balanceEGP: number;
  lastCreditAtUTC: string;
  entriesCount: number;
}

/**
 * Retrieves the credit balance and complete transaction ledger for a patient.
 * A PATIENT can only query their own balance.
 * An ADMIN can query any target patientId.
 */
export async function getPatientCreditBalanceAction(
  targetPatientId?: string,
): Promise<ActionResult<PatientCreditSummary>> {
  const guard = await requireRole(["PATIENT", "ADMIN"]);
  if (!guard.ok) return guard;

  const { user } = guard.data;
  const effectivePatientId = user.role === "PATIENT" ? user.id : targetPatientId;

  if (!effectivePatientId) {
    return failure("VALIDATION_ERROR", "معرّف المريض مطلوب.", "Patient ID is required.");
  }

  const patient = await prisma.user.findUnique({
    where: { id: effectivePatientId },
    select: { id: true, fullName: true, phone: true },
  });

  if (!patient) return Failures.notFound("المريض المطلوب");

  const rawEntries = await prisma.patientCredit.findMany({
    where: { patientId: effectivePatientId },
    orderBy: { createdAt: "desc" },
    include: {
      issuedBy: { select: { fullName: true } },
    },
  });

  let balanceSum = new Prisma.Decimal(0);
  for (const entry of rawEntries) {
    balanceSum = balanceSum.add(entry.amountEGP);
  }

  const entries: CreditLedgerEntry[] = rawEntries.map((e) => ({
    id: e.id,
    patientId: e.patientId,
    appointmentId: e.appointmentId,
    amountEGP: toEgp(e.amountEGP),
    kind: asCreditKind(e.kind),
    reason: e.reason,
    issuedById: e.issuedById,
    issuedByName: e.issuedBy?.fullName ?? null,
    settledAtUTC: e.settledAt ? e.settledAt.toISOString() : null,
    settlementRef: e.settlementRef,
    createdAtUTC: e.createdAt.toISOString(),
  }));

  return success({
    patientId: patient.id,
    patientName: patient.fullName,
    patientPhone: patient.phone,
    balanceEGP: Math.max(0, balanceSum.toNumber()),
    entries,
  });
}

/**
 * ADMIN: Debt Report listing all patients with an outstanding positive balance.
 * Sorted by oldest activity first to guarantee fair settlement.
 */
export async function getOutstandingCreditsAction(): Promise<ActionResult<OutstandingCreditRow[]>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  // Retrieve all credit entries
  const allCredits = await prisma.patientCredit.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      patient: {
        select: { id: true, fullName: true, phone: true, email: true },
      },
    },
  });

  // Aggregate by patient
  const patientMap = new Map<
    string,
    {
      patient: { id: string; fullName: string; phone: string; email: string };
      balance: Prisma.Decimal;
      lastCreditDate: Date;
      count: number;
    }
  >();

  for (const row of allCredits) {
    const existing = patientMap.get(row.patientId);
    if (!existing) {
      patientMap.set(row.patientId, {
        patient: row.patient,
        balance: row.amountEGP,
        lastCreditDate: row.createdAt,
        count: 1,
      });
    } else {
      existing.balance = existing.balance.add(row.amountEGP);
      existing.lastCreditDate = row.createdAt;
      existing.count += 1;
    }
  }

  const outstanding: OutstandingCreditRow[] = [];

  for (const [, item] of patientMap.entries()) {
    if (item.balance.gt(0)) {
      outstanding.push({
        patientId: item.patient.id,
        patientName: item.patient.fullName,
        patientPhone: item.patient.phone,
        patientEmail: item.patient.email,
        balanceEGP: item.balance.toNumber(),
        lastCreditAtUTC: item.lastCreditDate.toISOString(),
        entriesCount: item.count,
      });
    }
  }

  // Sort by highest debt first
  outstanding.sort((a, b) => b.balanceEGP - a.balanceEGP);

  return success(outstanding);
}

/**
 * ADMIN: Manual credit balance adjustment for a patient.
 */
export async function issueManualCreditAction(
  _prevState: ActionResult<{ creditId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ creditId: string }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;
  const { user: admin } = guard.data;

  const parsed = issueManualCreditSchema.safeParse({
    patientId: formData.get("patientId"),
    amountEGP: formData.get("amountEGP"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات إصدار الرصيد غير صالحة.",
      "Invalid credit details.",
      toFieldErrors(parsed.error),
    );
  }

  const { patientId, amountEGP, reason } = parsed.data;

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { id: true },
  });
  if (!patient) return Failures.notFound("المريض المطلوب");

  const credit = await prisma.patientCredit.create({
    data: {
      patientId,
      amountEGP: new Prisma.Decimal(amountEGP),
      kind: "MANUAL_ADJUSTMENT",
      reason,
      issuedById: admin.id,
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: "CREDIT_ADJUSTED",
    entityType: "PatientCredit",
    entityId: credit.id,
    metadata: {
      patientId,
      amountEGP,
    },
  });

  revalidatePath("/dashboard/admin/credits");
  revalidatePath("/dashboard/patient");

  return success({ creditId: credit.id });
}

/**
 * ADMIN: Settle outstanding credit by refunding the patient via InstaPay / Vodafone Cash.
 * Sets settledAt, marks positive rows, and records a balancing PAID_OUT row.
 */
export async function settleCreditAction(
  _prevState: ActionResult<{ settledCount: number; paidOutAmountEGP: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ settledCount: number; paidOutAmountEGP: number }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;
  const { user: admin } = guard.data;

  const parsed = settleCreditSchema.safeParse({
    patientId: formData.get("patientId"),
    settlementRef: formData.get("settlementRef"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "بيانات التسوية غير صالحة.",
      "Invalid settlement parameters.",
      toFieldErrors(parsed.error),
    );
  }

  const { patientId, settlementRef, notes } = parsed.data;

  const now = new Date();

  const outcome = await prisma.$transaction(async (tx) => {
    // 1. Fetch all unsettled positive credits for this patient
    const unsettledPositive = await tx.patientCredit.findMany({
      where: {
        patientId,
        settledAt: null,
        amountEGP: { gt: 0 },
      },
    });

    // 2. Fetch total net balance
    const allCredits = await tx.patientCredit.findMany({
      where: { patientId },
    });

    let currentBalance = new Prisma.Decimal(0);
    for (const c of allCredits) {
      currentBalance = currentBalance.add(c.amountEGP);
    }

    if (currentBalance.lte(0)) {
      throw new Error("NO_OUTSTANDING_BALANCE");
    }

    const payableAmount = currentBalance;

    // 3. Mark unsettled positive rows
    await tx.patientCredit.updateMany({
      where: {
        patientId,
        settledAt: null,
        amountEGP: { gt: 0 },
      },
      data: {
        settledAt: now,
        settledById: admin.id,
        settlementRef,
      },
    });

    // 4. Create balancing negative entry (PAID_OUT)
    const payoutEntry = await tx.patientCredit.create({
      data: {
        patientId,
        amountEGP: payableAmount.negated(),
        kind: "PAID_OUT",
        reason: notes ? `تسوية بنكية: ${notes}` : "تسوية رصيد وتحويل إلكتروني للمريض",
        issuedById: admin.id,
        settledAt: now,
        settledById: admin.id,
        settlementRef,
      },
    });

    return {
      settledCount: unsettledPositive.length,
      paidOutAmountEGP: payableAmount.toNumber(),
      payoutId: payoutEntry.id,
    };
  }).catch((err) => {
    if (err instanceof Error && err.message === "NO_OUTSTANDING_BALANCE") {
      return null;
    }
    throw err;
  });

  if (!outcome) {
    return failure(
      "INVALID_STATE",
      "لا يوجد رصيد مستحق قابل للتسوية لهذا المريض.",
      "This patient has no outstanding balance to settle.",
    );
  }

  await recordAudit({
    actorId: admin.id,
    action: "CREDIT_SETTLED",
    entityType: "PatientCredit",
    entityId: outcome.payoutId,
    metadata: {
      patientId,
      paidOutAmountEGP: outcome.paidOutAmountEGP,
      settlementRef,
    },
  });

  revalidatePath("/dashboard/admin/credits");
  revalidatePath("/dashboard/patient");

  return success({
    settledCount: outcome.settledCount,
    paidOutAmountEGP: outcome.paidOutAmountEGP,
  });
}
