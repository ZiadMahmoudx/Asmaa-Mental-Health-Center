"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import { requireRole } from "@/lib/auth/guards";
import { getAuthContext } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { recordAudit } from "@/lib/security/audit";
import {
  ASSESSMENT_SCALES,
  isAssessmentType,
  scoreAssessment,
  type AssessmentType,
  type SeverityBand,
} from "@/lib/content/assessment-scales";

/**
 * Standardised screening scales (PHQ-9, GAD-7, ISI).
 *
 * The one rule that shapes this module: **the client never supplies a score.**
 * The form posts raw per-item answers; the total, the severity band and the
 * risk flag are all recomputed here from the scale definition. These numbers
 * appear in a patient's record and a doctor reads them, so a tampered or
 * merely stale client total is not something to persist.
 */

export interface AssessmentResultPayload {
  assessmentId: string;
  type: AssessmentType;
  totalScore: number;
  maxScore: number;
  severityBand: SeverityBand;
  labelAr: string;
  labelEn: string;
  interpretationAr: string;
  interpretationEn: string;
  tone: string;
  riskItemEndorsed: boolean;
}

export async function submitAssessmentAction(
  _prevState: ActionResult<AssessmentResultPayload> | null,
  formData: FormData,
): Promise<ActionResult<AssessmentResultPayload>> {
  const guard = await requireRole(["PATIENT"], formData);
  if (!guard.ok) return guard;
  const { user } = guard.data;

  const throttle = consumeRateLimit(`assessment:${user.id}`, { limit: 20, windowSeconds: 3600 });
  if (!throttle.allowed) return Failures.rateLimited(throttle.retryAfterSeconds);

  const rawType = String(formData.get("type") ?? "");
  if (!isAssessmentType(rawType)) {
    return failure("VALIDATION_ERROR", "نوع المقياس غير صالح.", "Unknown assessment type.");
  }

  const scale = ASSESSMENT_SCALES[rawType];

  // Collect one field per item. Anything outside the scale's own option set is
  // discarded by scoreAssessment rather than trusted.
  const answers: Record<string, number> = {};
  for (const question of scale.questions) {
    const raw = formData.get(`answer_${question.id}`);
    if (typeof raw === "string" && raw !== "") {
      const value = Number(raw);
      if (Number.isFinite(value)) answers[question.id] = value;
    }
  }

  const missing = scale.questions.filter((question) => answers[question.id] === undefined);
  if (missing.length > 0) {
    return failure(
      "VALIDATION_ERROR",
      `يرجى الإجابة على جميع الأسئلة (${missing.length} سؤال متبقٍ).`,
      `Please answer every question (${missing.length} remaining).`,
    );
  }

  const scored = scoreAssessment(scale, answers);

  const assessment = await prisma.clinicalAssessment.create({
    data: {
      patientId: user.id,
      type: rawType,
      answersJson: JSON.stringify(answers),
      totalScore: scored.totalScore,
      maxScore: scored.maxScore,
      severityBand: scored.band,
      riskItemEndorsed: scored.riskItemEndorsed,
    },
    select: { id: true },
  });

  await recordAudit({
    actorId: user.id,
    action: "ASSESSMENT_COMPLETED",
    entityType: "ClinicalAssessment",
    entityId: assessment.id,
    // Band and flag only; the item-level answers stay out of the audit trail.
    metadata: {
      type: rawType,
      severityBand: scored.band,
      riskItemEndorsed: scored.riskItemEndorsed,
    },
  });

  revalidatePath("/dashboard/patient");

  return success({
    assessmentId: assessment.id,
    type: rawType,
    totalScore: scored.totalScore,
    maxScore: scored.maxScore,
    severityBand: scored.band,
    labelAr: scored.labelAr,
    labelEn: scored.labelEn,
    interpretationAr: scored.interpretationAr,
    interpretationEn: scored.interpretationEn,
    tone: scored.tone,
    riskItemEndorsed: scored.riskItemEndorsed,
  });
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface AssessmentHistoryRow {
  id: string;
  type: AssessmentType;
  titleAr: string;
  titleEn: string;
  totalScore: number;
  maxScore: number;
  severityBand: string;
  labelAr: string;
  labelEn: string;
  tone: string;
  riskItemEndorsed: boolean;
  completedAtUTC: string;
}

function toHistoryRow(row: {
  id: string;
  type: string;
  totalScore: number;
  maxScore: number;
  severityBand: string;
  riskItemEndorsed: boolean;
  completedAt: Date;
}): AssessmentHistoryRow | null {
  if (!isAssessmentType(row.type)) return null;
  const scale = ASSESSMENT_SCALES[row.type];

  // Re-resolve the band's labels from the scale so wording stays in one place;
  // the stored band is the source of truth for which rule applied.
  const rule =
    scale.severityRules.find((candidate) => candidate.band === row.severityBand) ??
    scale.severityRules.find((candidate) => row.totalScore <= candidate.maxScore) ??
    scale.severityRules[scale.severityRules.length - 1]!;

  return {
    id: row.id,
    type: row.type,
    titleAr: scale.titleAr,
    titleEn: scale.titleEn,
    totalScore: row.totalScore,
    maxScore: row.maxScore,
    severityBand: row.severityBand,
    labelAr: rule.labelAr,
    labelEn: rule.labelEn,
    tone: rule.tone,
    riskItemEndorsed: row.riskItemEndorsed,
    completedAtUTC: row.completedAt.toISOString(),
  };
}

/** The signed-in patient's own scale history, newest first. */
export async function getMyAssessmentsAction(): Promise<ActionResult<AssessmentHistoryRow[]>> {
  const auth = await getAuthContext();
  if (!auth) return Failures.unauthenticated();

  const rows = await prisma.clinicalAssessment.findMany({
    where: { patientId: auth.user.id },
    orderBy: { completedAt: "desc" },
    take: 40,
    select: {
      id: true,
      type: true,
      totalScore: true,
      maxScore: true,
      severityBand: true,
      riskItemEndorsed: true,
      completedAt: true,
    },
  });

  return success(rows.map(toHistoryRow).filter((row): row is AssessmentHistoryRow => row !== null));
}

/**
 * A patient's scales, for the treating doctor.
 *
 * Scoped to patients this doctor actually has an appointment with, so a doctor
 * cannot read the screening history of someone who is not under their care.
 */
export async function getPatientAssessmentsAction(
  patientId: string,
): Promise<ActionResult<AssessmentHistoryRow[]>> {
  const guard = await requireRole(["DOCTOR"]);
  if (!guard.ok) return guard;

  const profile = await prisma.doctorProfile.findUnique({
    where: { userId: guard.data.user.id },
    select: { id: true },
  });
  if (!profile) return Failures.forbidden();

  const hasSharedAppointment = await prisma.appointment.findFirst({
    where: { doctorId: profile.id, patientId },
    select: { id: true },
  });
  if (!hasSharedAppointment) return Failures.forbidden();

  const rows = await prisma.clinicalAssessment.findMany({
    where: { patientId },
    orderBy: { completedAt: "desc" },
    take: 40,
    select: {
      id: true,
      type: true,
      totalScore: true,
      maxScore: true,
      severityBand: true,
      riskItemEndorsed: true,
      completedAt: true,
    },
  });

  if (rows.length > 0) {
    await recordAudit({
      actorId: guard.data.user.id,
      action: "ASSESSMENT_VIEWED",
      entityType: "ClinicalAssessment",
      entityId: patientId,
      metadata: { count: rows.length },
    });
  }

  return success(rows.map(toHistoryRow).filter((row): row is AssessmentHistoryRow => row !== null));
}
