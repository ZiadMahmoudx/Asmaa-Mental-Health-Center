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
 * Uses database-level grouping and aggregation (F9).
 */
export async function getOutstandingCreditsAction(): Promise<ActionResult<OutstandingCreditRow[]>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  // Aggregate directly in the database engine
  const groups = await prisma.patientCredit.groupBy({
    by: ["patientId"],
    _sum: { amountEGP: true },
    _max: { createdAt: true },
    _count: true,
    having: {
      amountEGP: {
        _sum: {
          gt: 0,
        },
      },
    },
  });

  if (groups.length === 0) {
    return success([]);
  }

  const patientIds = groups.map((g) => g.patientId);

  const patients = await prisma.user.findMany({
    where: { id: { in: patientIds } },
    select: { id: true, fullName: true, phone: true, email: true },
  });

  const patientMap = new Map(patients.map((p) => [p.id, p]));

  const outstanding: OutstandingCreditRow[] = [];
  for (const group of groups) {
    const patient = patientMap.get(group.patientId);
    if (!patient) continue;
    const balance = group._sum.amountEGP ? group._sum.amountEGP.toNumber() : 0;
    outstanding.push({
      patientId: patient.id,
      patientName: patient.fullName,
      patientPhone: patient.phone,
      patientEmail: patient.email,
      balanceEGP: balance,
      lastCreditAtUTC: (group._max.createdAt ?? new Date()).toISOString(),
      entriesCount: group._count,
    });
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
      "بيانات الرصيد غير صالحة.",
      "Invalid manual credit parameters.",
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
 * Protected with SERIALIZABLE isolation to prevent concurrent double payouts (F7 & F8).
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

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        // 1. Calculate net balance inside Serializable isolation
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

        // 2. Mark unsettled positive rows
        const marked = await tx.patientCredit.updateMany({
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

        // 3. Create balancing negative entry (PAID_OUT)
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
          settledCount: marked.count,
          paidOutAmountEGP: payableAmount.toNumber(),
          payoutId: payoutEntry.id,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

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
  } catch (error) {
    if (error instanceof Error && error.message === "NO_OUTSTANDING_BALANCE") {
      return failure(
        "INVALID_STATE",
        "لا يوجد رصيد مستحق قابل للتسوية لهذا المريض.",
        "This patient has no outstanding balance to settle.",
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure(
        "CONFLICT",
        "تمت معالجة تسوية هذا الرصيد بالفعل أو أن رقم المعاملة مسجل مسبقاً. يرجى تحديث الصفحة.",
        "Credit was already settled or transaction reference is duplicate.",
      );
    }
    console.error("[settleCreditAction] Transaction error:", error);
    return failure(
      "CONFLICT",
      "تعذّر إتمام التسوية لوجود تعارض متزامن. يرجى تحديث الصفحة والمحاولة مجدداً.",
      "Settlement conflicted with a concurrent transaction. Please refresh.",
    );
  }
}
