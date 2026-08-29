"use server";

import { prisma } from "@/lib/prisma";
import { ActionResult, success } from "@/lib/result";
import { requireRole } from "@/lib/auth/guards";
import { toEgp, toStringArray } from "@/lib/serialization";

/**
 * Clinic metrics for the admin dashboard.
 *
 * Every figure here is a query. The screen this replaces displayed typed-in
 * literals — 15,482 sessions, 4.96 stars, 35+ consultants, 142 crisis
 * interventions — which is worse than showing nothing: it reads as reporting
 * and cannot be acted on. Where the platform genuinely does not collect
 * something yet (patient ratings, for instance), the metric is absent rather
 * than invented.
 */

export interface ClinicMetrics {
  /** Sessions actually delivered. */
  completedSessions: number;
  confirmedUpcoming: number;
  /** Receipts sitting in the verification queue right now. */
  pendingReceipts: number;
  /** Reservations holding a slot but not yet paid. */
  openHolds: number;
  activePatients: number;
  activeDoctors: number;
  acceptingDoctors: number;
  /** Revenue from sessions that have been delivered, in EGP. */
  completedRevenueEGP: number;
  /** Revenue confirmed and paid for but not yet delivered. */
  confirmedPipelineEGP: number;
  sessionsLast30Days: number;
  /** Intakes that tripped the safety item and are not yet reviewed. */
  unreviewedCrisisIntakes: number;
  /** Screening scales where a safety-flagged item was endorsed, last 30 days. */
  riskFlaggedAssessments: number;
  onlineShare: number;
  offlineShare: number;
}

export interface DoctorRosterRow {
  id: string;
  fullName: string;
  title: string;
  licenseNumber: string;
  specialties: string[];
  isAcceptingPatients: boolean;
  availabilityWindows: number;
  upcomingSessions: number;
  completedSessions: number;
  priceOnlineEGP: number;
  priceOfflineEGP: number;
}

export async function getClinicMetricsAction(): Promise<ActionResult<ClinicMetrics>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    completedSessions,
    confirmedUpcoming,
    pendingReceipts,
    openHolds,
    activePatients,
    activeDoctors,
    acceptingDoctors,
    sessionsLast30Days,
    unreviewedCrisisIntakes,
    riskFlaggedAssessments,
    onlineCount,
    offlineCount,
    completedRevenue,
    confirmedPipeline,
  ] = await Promise.all([
    prisma.appointment.count({ where: { status: "COMPLETED" } }),
    prisma.appointment.count({
      where: { status: "CONFIRMED", scheduledAtUTC: { gte: now } },
    }),
    prisma.paymentProof.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.appointment.count({
      where: {
        status: "PENDING_PAYMENT_PROOF",
        slotLockKey: "ACTIVE",
        holdExpiresAt: { gt: now },
      },
    }),
    prisma.user.count({ where: { role: "PATIENT", isActive: true } }),
    prisma.doctorProfile.count({ where: { user: { isActive: true } } }),
    prisma.doctorProfile.count({
      where: { user: { isActive: true }, isAcceptingPatients: true },
    }),
    prisma.appointment.count({
      where: { status: "COMPLETED", scheduledAtUTC: { gte: thirtyDaysAgo } },
    }),
    prisma.intakeAssessment.count({ where: { crisisFlagged: true, reviewedAt: null } }),
    prisma.clinicalAssessment.count({
      where: { status: "COMPLETED", riskItemEndorsed: true, completedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.appointment.count({
      where: { type: "ONLINE", status: { in: ["CONFIRMED", "COMPLETED"] } },
    }),
    prisma.appointment.count({
      where: { type: "OFFLINE", status: { in: ["CONFIRMED", "COMPLETED"] } },
    }),
    prisma.appointment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { priceEGP: true },
    }),
    prisma.appointment.aggregate({
      where: { status: "CONFIRMED", scheduledAtUTC: { gte: now } },
      _sum: { priceEGP: true },
    }),
  ]);

  const typedTotal = onlineCount + offlineCount;

  return success({
    completedSessions,
    confirmedUpcoming,
    pendingReceipts,
    openHolds,
    activePatients,
    activeDoctors,
    acceptingDoctors,
    completedRevenueEGP: toEgp(completedRevenue._sum.priceEGP),
    confirmedPipelineEGP: toEgp(confirmedPipeline._sum.priceEGP),
    sessionsLast30Days,
    unreviewedCrisisIntakes,
    riskFlaggedAssessments,
    // Guard the division: a clinic on day one has no typed appointments at all.
    onlineShare: typedTotal === 0 ? 0 : Math.round((onlineCount / typedTotal) * 100),
    offlineShare: typedTotal === 0 ? 0 : Math.round((offlineCount / typedTotal) * 100),
  });
}

/** The consultant roster, with each doctor's real workload. */
export async function getDoctorRosterAction(): Promise<ActionResult<DoctorRosterRow[]>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  const now = new Date();

  const doctors = await prisma.doctorProfile.findMany({
    where: { user: { isActive: true } },
    orderBy: [{ isAcceptingPatients: "desc" }, { yearsOfExperience: "desc" }],
    select: {
      id: true,
      title: true,
      licenseNumber: true,
      specialtiesJson: true,
      isAcceptingPatients: true,
      sessionPriceOnline: true,
      sessionPriceOffline: true,
      user: { select: { fullName: true } },
      _count: { select: { availability: true } },
      appointments: {
        where: {
          OR: [
            { status: "CONFIRMED", scheduledAtUTC: { gte: now } },
            { status: "COMPLETED" },
          ],
        },
        select: { status: true },
      },
    },
  });

  return success(
    doctors.map((doctor) => ({
      id: doctor.id,
      fullName: doctor.user.fullName,
      title: doctor.title,
      licenseNumber: doctor.licenseNumber,
      specialties: toStringArray(doctor.specialtiesJson),
      isAcceptingPatients: doctor.isAcceptingPatients,
      availabilityWindows: doctor._count.availability,
      upcomingSessions: doctor.appointments.filter((a) => a.status === "CONFIRMED").length,
      completedSessions: doctor.appointments.filter((a) => a.status === "COMPLETED").length,
      priceOnlineEGP: toEgp(doctor.sessionPriceOnline),
      priceOfflineEGP: toEgp(doctor.sessionPriceOffline),
    })),
  );
}
