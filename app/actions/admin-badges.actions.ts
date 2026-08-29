"use server";

import "server-only";
import { prisma } from "@/lib/prisma";
import { ActionResult, success } from "@/lib/result";
import { requireRole } from "@/lib/auth/guards";

export interface AdminBadgeCounts {
  unacknowledgedSafetyAlerts: number;
  criticalCrisisAlerts: number;
  pendingPaymentProofs: number;
  urgentProofsOver24h: number;
  unsettledCredits: number;
  upcomingReminders: number;
}

/**
 * Single aggregated query returning all actionable badge counters across the admin workspace.
 */
export async function getAdminBadgeCountsAction(): Promise<ActionResult<AdminBadgeCounts>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [
    unacknowledgedSafetyAlerts,
    criticalCrisisAlerts,
    pendingPaymentProofs,
    urgentProofsOver24h,
    creditGroups,
    upcomingReminders,
  ] = await Promise.all([
    // 1. Unacknowledged safety alerts
    prisma.safetyAlert.count({
      where: { acknowledgedAt: null, resolvedAt: null },
    }),
    // 2. Unresolved CRISIS severity alerts
    prisma.safetyAlert.count({
      where: { severity: "CRISIS", resolvedAt: null },
    }),
    // 3. Pending payment proofs in verification queue
    prisma.paymentProof.count({
      where: { status: "UNDER_REVIEW" },
    }),
    // 4. Stale proofs over 24h approaching SLA
    prisma.paymentProof.count({
      where: { status: "UNDER_REVIEW", uploadedAt: { lt: dayAgo } },
    }),
    // 5. Patients carrying an outstanding credit balance.
    //
    // The ledger is signed — a balance is SUM(amountEGP), never a row count. A
    // CANCELLATION entry keeps `settlementRef: null` forever once the patient has
    // spent the credit on a booking (the offsetting USED_IN_BOOKING row is what
    // clears it), so counting rows would report work that no longer exists and
    // the badge would never fall back to zero. This mirrors the exact predicate
    // used by `getOutstandingCreditsAction`, which is the desk this badge links to.
    prisma.patientCredit.groupBy({
      by: ["patientId"],
      _sum: { amountEGP: true },
      having: { amountEGP: { _sum: { gt: 0 } } },
    }),
    // 6. Upcoming confirmed appointments without sent reminders (next 48h)
    prisma.appointment.count({
      where: {
        status: "CONFIRMED",
        scheduledAtUTC: { gte: now, lte: in48Hours },
        reminderSentAt: null,
      },
    }),
  ]);

  return success({
    unacknowledgedSafetyAlerts,
    criticalCrisisAlerts,
    pendingPaymentProofs,
    urgentProofsOver24h,
    unsettledCredits: creditGroups.length,
    upcomingReminders,
  });
}
