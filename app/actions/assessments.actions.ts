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
  type SubscaleScore,
} from "@/lib/content/assessment-scales";

export interface AssessmentResultPayload {
  assessmentId: string;
  type: AssessmentType;
  scaleVersion: number;
  totalScore: number;
  maxScore: number;
  severityBand: SeverityBand;
  labelAr: string;
  labelEn: string;
  interpretationAr: string;
  interpretationEn: string;
  tone: string;
  riskItemEndorsed: boolean;
  subscaleScores?: SubscaleScore[];
}

export interface AssessmentDraftPayload {
  id: string;
  type: AssessmentType;
  scaleVersion: number;
  answers: Record<string, number>;
  updatedAtUTC: string;
}

/**
 * Submit and complete a standardized assessment questionnaire.
 * Evaluates scoring and risk rules, records the clinical record and transactionally
 * creates a SafetyAlert if a crisis/risk item was endorsed (Phase 1).
 */
export async function submitAssessmentAction(
  _prevState: ActionResult<AssessmentResultPayload> | null,
  formData: FormData,
): Promise<ActionResult<AssessmentResultPayload>> {
  const guard = await requireRole(["PATIENT"], formData);
  if (!guard.ok) return guard;
  const { user } = guard.data;

  const throttle = consumeRateLimit(`assessment:${user.id}`, { limit: 30, windowSeconds: 3600 });
  if (!throttle.allowed) return Failures.rateLimited(throttle.retryAfterSeconds);

  const rawType = String(formData.get("type") ?? "");
  if (!isAssessmentType(rawType)) {
    return failure("VALIDATION_ERROR", "نوع المقياس غير صالح.", "Unknown assessment type.");
  }

  const scale = ASSESSMENT_SCALES[rawType];

  // Collect one field per item. Out-of-range values are clamped to the scale's option set.
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
  const now = new Date();

  const outcome = await prisma.$transaction(
    async (tx) => {
      // 1. Check if there was an existing DRAFT to promote (F22: newest wins)
      const existingDraft = await tx.clinicalAssessment.findFirst({
        where: {
          patientId: user.id,
          type: rawType,
          status: "DRAFT",
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      let assessmentId: string;

      if (existingDraft) {
        const updated = await tx.clinicalAssessment.update({
          where: { id: existingDraft.id },
          data: {
            scaleVersion: scale.version,
            status: "COMPLETED",
            answersJson: JSON.stringify(answers),
            totalScore: scored.totalScore,
            maxScore: scored.maxScore,
            severityBand: scored.band,
            riskItemEndorsed: scored.riskItemEndorsed,
            completedAt: now,
          },
          select: { id: true },
        });
        assessmentId = updated.id;
      } else {
        const created = await tx.clinicalAssessment.create({
          data: {
            patientId: user.id,
            type: rawType,
            scaleVersion: scale.version,
            status: "COMPLETED",
            answersJson: JSON.stringify(answers),
            totalScore: scored.totalScore,
            maxScore: scored.maxScore,
            severityBand: scored.band,
            riskItemEndorsed: scored.riskItemEndorsed,
            completedAt: now,
          },
          select: { id: true },
        });
        assessmentId = created.id;
      }

      // 2. Transactional Safety Escalation & De-duplication (F20 & F25):
      // If a risk item was endorsed, upgrade existing open draft alert or create fresh alert.
      if (scored.riskItemEndorsed) {
        const openAlert = await tx.safetyAlert.findFirst({
          where: {
            patientId: user.id,
            source: "ASSESSMENT",
            sourceId: assessmentId,
            resolvedAt: null,
          },
        });

        if (openAlert) {
          // Upgrade draft alert to final completion alert, preserving staff acknowledgment status
          await tx.safetyAlert.update({
            where: { id: openAlert.id },
            data: {
              detail: `${rawType}_SAFETY`,
            },
          });
        } else {
          await tx.safetyAlert.create({
            data: {
              patientId: user.id,
              source: "ASSESSMENT",
              sourceId: assessmentId,
              severity: "CRISIS",
              detail: `${rawType}_SAFETY`,
            },
          });
        }
      } else {
        // F25: If risk was NOT endorsed upon final completion, check if an open draft alert was created mid-flow
        const openDraftAlert = await tx.safetyAlert.findFirst({
          where: {
            patientId: user.id,
            source: "ASSESSMENT",
            sourceId: assessmentId,
            resolvedAt: null,
          },
        });

        if (openDraftAlert) {
          // Patient disclosed risk during draft step, then retracted it prior to submission.
          // Keep open for clinical safety review, but accurately mark as RETRACTED.
          await tx.safetyAlert.update({
            where: { id: openDraftAlert.id },
            data: {
              detail: `${rawType}_SAFETY_RETRACTED`,
            },
          });
        }
      }

      return { assessmentId };
    },
  );

  await recordAudit({
    actorId: user.id,
    action: "ASSESSMENT_COMPLETED",
    entityType: "ClinicalAssessment",
    entityId: outcome.assessmentId,
    metadata: {
      type: rawType,
      scaleVersion: scale.version,
      severityBand: scored.band,
      riskItemEndorsed: scored.riskItemEndorsed,
    },
  });

  revalidatePath("/dashboard/patient");
  revalidatePath("/dashboard/admin");

  return success({
    assessmentId: outcome.assessmentId,
    type: rawType,
    scaleVersion: scale.version,
    totalScore: scored.totalScore,
    maxScore: scored.maxScore,
    severityBand: scored.band,
    labelAr: scored.labelAr,
    labelEn: scored.labelEn,
    interpretationAr: scored.interpretationAr,
    interpretationEn: scored.interpretationEn,
    tone: scored.tone,
    riskItemEndorsed: scored.riskItemEndorsed,
    subscaleScores: scored.subscaleScores,
  });
}

/**
 * Save an in-progress assessment draft on step transitions.
 * Guarded with CSRF, rate limited (120/hr), validates & clamps answers to scale options,
 * and triggers immediate SafetyAlerts if a risk question is endorsed mid-flow (F21).
 */
export async function saveAssessmentDraftAction(
  _prevState: ActionResult<{ draftId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ draftId: string }>> {
  const guard = await requireRole(["PATIENT"], formData);
  if (!guard.ok) return guard;
  const { user } = guard.data;

  const throttle = consumeRateLimit(`assessment-draft:${user.id}`, { limit: 120, windowSeconds: 3600 });
  if (!throttle.allowed) {
    // F28: If a rate-limited draft write contained a risk disclosure, record a durable audit entry
    const rawType = String(formData.get("type") ?? "");
    let riskDisclosed = false;
    if (isAssessmentType(rawType)) {
      const scale = ASSESSMENT_SCALES[rawType];
      for (const question of scale.questions) {
        const raw = formData.get(`answer_${question.id}`);
        const val = typeof raw === "string" && raw !== "" ? Number(raw) : 0;
        if (question.isRiskItem && val > 0) riskDisclosed = true;
        if (scale.riskRules && scale.riskRules.some((r) => r.questionIds.includes(question.id) && val >= r.minScore)) {
          riskDisclosed = true;
        }
      }
    }
    if (riskDisclosed) {
      await recordAudit({
        actorId: user.id,
        action: "ASSESSMENT_DRAFT_REJECTED",
        entityType: "ClinicalAssessment",
        entityId: user.id,
        metadata: {
          reason: "RATE_LIMITED",
          type: rawType,
        },
      });
    }
    return Failures.rateLimited(throttle.retryAfterSeconds);
  }

  const rawType = String(formData.get("type") ?? "");
  if (!isAssessmentType(rawType)) {
    return failure("VALIDATION_ERROR", "نوع المقياس غير صالح.", "Invalid assessment type.");
  }

  const scale = ASSESSMENT_SCALES[rawType];

  // Strictly collect and validate answers against scale questions, clamping scores and discarding unknown keys (F21)
  const answers: Record<string, number> = {};
  for (const question of scale.questions) {
    const raw = formData.get(`answer_${question.id}`);
    if (typeof raw === "string" && raw !== "") {
      const value = Number(raw);
      if (Number.isFinite(value)) {
        const opts = question.options ?? scale.options;
        const minScore = Math.min(...opts.map((o) => o.score));
        const maxScore = Math.max(...opts.map((o) => o.score));
        answers[question.id] = Math.min(Math.max(value, minScore), maxScore);
      }
    }
  }

  const scored = scoreAssessment(scale, answers);

  const outcome = await prisma.$transaction(async (tx) => {
    // F22: Deterministic newest draft lookup
    const existing = await tx.clinicalAssessment.findFirst({
      where: {
        patientId: user.id,
        type: rawType,
        status: "DRAFT",
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    let draftId: string;

    if (existing) {
      const updated = await tx.clinicalAssessment.update({
        where: { id: existing.id },
        data: {
          scaleVersion: scale.version,
          answersJson: JSON.stringify(answers),
          totalScore: scored.totalScore,
          maxScore: scored.maxScore,
          severityBand: scored.band,
          riskItemEndorsed: scored.riskItemEndorsed,
        },
        select: { id: true },
      });
      draftId = updated.id;
    } else {
      const created = await tx.clinicalAssessment.create({
        data: {
          patientId: user.id,
          type: rawType,
          scaleVersion: scale.version,
          status: "DRAFT",
          answersJson: JSON.stringify(answers),
          totalScore: scored.totalScore,
          maxScore: scored.maxScore,
          severityBand: scored.band,
          riskItemEndorsed: scored.riskItemEndorsed,
          completedAt: null,
        },
        select: { id: true },
      });
      draftId = created.id;
    }

    // Mid-flow safety escalation: if a risk question was endorsed during drafting,
    // ensure an open SafetyAlert exists immediately without duplicating (F20)
    if (scored.riskItemEndorsed) {
      const openAlert = await tx.safetyAlert.findFirst({
        where: {
          patientId: user.id,
          source: "ASSESSMENT",
          sourceId: draftId,
          resolvedAt: null,
        },
      });

      if (!openAlert) {
        await tx.safetyAlert.create({
          data: {
            patientId: user.id,
            source: "ASSESSMENT",
            sourceId: draftId,
            severity: "CRISIS",
            detail: `${rawType}_SAFETY_DRAFT`,
          },
        });
      }
    }

    return { draftId };
  });

  return success(outcome);
}

/**
 * Retrieve active draft for a scale if one exists (F22: newest draft wins).
 */
export async function getAssessmentDraftAction(
  type: string,
): Promise<ActionResult<AssessmentDraftPayload | null>> {
  const auth = await getAuthContext();
  if (!auth) return Failures.unauthenticated();

  if (!isAssessmentType(type)) return success(null);

  const draft = await prisma.clinicalAssessment.findFirst({
    where: {
      patientId: auth.user.id,
      type,
      status: "DRAFT",
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      type: true,
      scaleVersion: true,
      answersJson: true,
      updatedAt: true,
    },
  });

  if (!draft) return success(null);

  let answers: Record<string, number> = {};
  try {
    answers = JSON.parse(draft.answersJson);
  } catch {
    answers = {};
  }

  return success({
    id: draft.id,
    type: draft.type as AssessmentType,
    scaleVersion: draft.scaleVersion,
    answers,
    updatedAtUTC: draft.updatedAt.toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Reads (strictly filtered to status: "COMPLETED")
// ---------------------------------------------------------------------------

export interface AssessmentHistoryRow {
  id: string;
  type: AssessmentType;
  scaleVersion: number;
  titleAr: string;
  titleEn: string;
  totalScore: number;
  maxScore: number;
  severityBand: string;
  labelAr: string;
  labelEn: string;
  tone: string;
  riskItemEndorsed: boolean;
  subscaleScores?: SubscaleScore[];
  completedAtUTC: string;
}

function toHistoryRow(row: {
  id: string;
  type: string;
  scaleVersion: number;
  answersJson: string;
  totalScore: number;
  maxScore: number;
  severityBand: string;
  riskItemEndorsed: boolean;
  completedAt: Date | null;
}): AssessmentHistoryRow | null {
  if (!isAssessmentType(row.type) || !row.completedAt) return null;
  const scale = ASSESSMENT_SCALES[row.type];

  // Re-resolve labels and subscales from current definition
  const rule =
    scale.severityRules.find((candidate) => candidate.band === row.severityBand) ??
    scale.severityRules.find((candidate) => row.totalScore <= candidate.maxScore) ??
    scale.severityRules[scale.severityRules.length - 1]!;

  let subscaleScores: SubscaleScore[] | undefined;
  if (scale.subscales && scale.subscales.length > 0) {
    try {
      const answers = JSON.parse(row.answersJson);
      const scored = scoreAssessment(scale, answers);
      subscaleScores = scored.subscaleScores;
    } catch {
      subscaleScores = undefined;
    }
  }

  return {
    id: row.id,
    type: row.type,
    scaleVersion: row.scaleVersion,
    titleAr: scale.titleAr,
    titleEn: scale.titleEn,
    totalScore: row.totalScore,
    maxScore: row.maxScore,
    severityBand: row.severityBand,
    labelAr: rule.labelAr,
    labelEn: rule.labelEn,
    tone: rule.tone,
    riskItemEndorsed: row.riskItemEndorsed,
    subscaleScores,
    completedAtUTC: row.completedAt.toISOString(),
  };
}

/** The signed-in patient's own scale history, newest first (COMPLETED only). */
export async function getMyAssessmentsAction(): Promise<ActionResult<AssessmentHistoryRow[]>> {
  const auth = await getAuthContext();
  if (!auth) return Failures.unauthenticated();

  const rows = await prisma.clinicalAssessment.findMany({
    where: {
      patientId: auth.user.id,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      scaleVersion: true,
      answersJson: true,
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
 * A patient's scales, for the treating doctor (COMPLETED only).
 * Scoped to patients this doctor has an active care relationship with.
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
    where: {
      patientId,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      scaleVersion: true,
      answersJson: true,
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

