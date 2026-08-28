"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import { requireRole } from "@/lib/auth/guards";
import { getAuthContext } from "@/lib/auth/session";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { recordAudit } from "@/lib/security/audit";
import { toEgp, toStringArray } from "@/lib/serialization";
import { toFieldErrors } from "@/lib/validation/schemas";
import {
  AGE_GROUPS,
  CONCERN_TAGS,
  GENDER_PREFERENCES,
  MEDICATION_HISTORY,
  SCREENING_QUESTIONS,
  THERAPY_HISTORY,
  scoreIntake,
  type ConcernTag,
} from "@/lib/content/intake";

/**
 * Clinical intake (triage).
 *
 * The old version wrote to a React context and matched doctors against
 * hard-coded ids (`doc-1`) that do not exist in the database, so matching was
 * silently returning nothing. This does the matching for real: consultants
 * declare the concern tags they treat, and the questionnaire ranks them by
 * overlap with what the patient reported.
 *
 * Scoring and crisis detection happen here, not in the browser. The client
 * renders a live preview from the same pure functions, but what gets stored —
 * and what the clinic acts on — is computed server-side from the raw answers.
 */

const intakeSchema = z.object({
  concerns: z
    .array(z.enum(CONCERN_TAGS))
    .min(1, "يرجى اختيار شكوى واحدة على الأقل")
    .max(CONCERN_TAGS.length),
  ageGroup: z.enum(AGE_GROUPS),
  therapyHistory: z.enum(THERAPY_HISTORY),
  medicationHistory: z.enum(MEDICATION_HISTORY),
  genderPreference: z.enum(GENDER_PREFERENCES),
  answers: z.record(z.string(), z.coerce.number().int().min(0).max(4)),
});

export interface MatchedDoctor {
  id: string;
  fullName: string;
  title: string;
  matchedConcerns: ConcernTag[];
  matchScore: number;
  priceOnlineEGP: number;
  priceOfflineEGP: number;
  yearsOfExperience: number;
}

export interface IntakeResultPayload {
  intakeId: string;
  severityScore: number;
  maxScore: number;
  urgencyLevel: "STABLE" | "EVALUATE" | "CRISIS_EMERGENCY";
  crisisFlagged: boolean;
  matches: MatchedDoctor[];
}

/**
 * Score, match and persist an intake.
 *
 * Requires a signed-in patient. Triage results are clinical data about a named
 * person and the clinic acts on the crisis flag, so an anonymous submission
 * would be both un-actionable and un-attributable.
 */
export async function submitIntakeAction(
  _prevState: ActionResult<IntakeResultPayload> | null,
  formData: FormData,
): Promise<ActionResult<IntakeResultPayload>> {
  const guard = await requireRole(["PATIENT"], formData);
  if (!guard.ok) return guard;
  const { user } = guard.data;

  const throttle = consumeRateLimit(`intake:${user.id}`, { limit: 10, windowSeconds: 3600 });
  if (!throttle.allowed) return Failures.rateLimited(throttle.retryAfterSeconds);

  // Answers arrive as one field per screening question.
  const answers: Record<string, number> = {};
  for (const question of SCREENING_QUESTIONS) {
    const raw = formData.get(`answer_${question.id}`);
    if (typeof raw === "string" && raw !== "") answers[question.id] = Number(raw);
  }

  const parsed = intakeSchema.safeParse({
    concerns: formData.getAll("concerns").map(String),
    ageGroup: formData.get("ageGroup"),
    therapyHistory: formData.get("therapyHistory"),
    medicationHistory: formData.get("medicationHistory"),
    genderPreference: formData.get("genderPreference"),
    answers,
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى استكمال جميع خطوات الاستبيان.",
      "Please complete every step of the questionnaire.",
      toFieldErrors(parsed.error),
    );
  }

  const input = parsed.data;

  // Every screening item must be answered — a partial screen produces a
  // misleadingly low severity score.
  const unanswered = SCREENING_QUESTIONS.filter(
    (question) => input.answers[question.id] === undefined,
  );
  if (unanswered.length > 0) {
    return failure(
      "VALIDATION_ERROR",
      "يرجى الإجابة على جميع أسئلة المقياس السريري.",
      "Please answer every screening question.",
    );
  }

  const scored = scoreIntake(input.answers);

  // --- match consultants -------------------------------------------------
  const doctors = await prisma.doctorProfile.findMany({
    where: { isAcceptingPatients: true, user: { isActive: true } },
    select: {
      id: true,
      title: true,
      concernTagsJson: true,
      gender: true,
      yearsOfExperience: true,
      sessionPriceOnline: true,
      sessionPriceOffline: true,
      user: { select: { fullName: true } },
    },
  });

  const selected = new Set<string>(input.concerns);

  const matches: MatchedDoctor[] = doctors
    .map((doctor) => {
      const tags = toStringArray(doctor.concernTagsJson);
      const matchedConcerns = tags.filter((tag) => selected.has(tag)) as ConcernTag[];

      // Concern overlap dominates; a satisfied gender preference is a nudge, not
      // a filter, so a patient is never left with no one to see.
      const genderBonus =
        input.genderPreference !== "ANY" && doctor.gender === input.genderPreference ? 0.5 : 0;

      return {
        id: doctor.id,
        fullName: doctor.user.fullName,
        title: doctor.title,
        matchedConcerns,
        matchScore: matchedConcerns.length + genderBonus,
        priceOnlineEGP: toEgp(doctor.sessionPriceOnline),
        priceOfflineEGP: toEgp(doctor.sessionPriceOffline),
        yearsOfExperience: doctor.yearsOfExperience,
      };
    })
    .filter((match) => match.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || b.yearsOfExperience - a.yearsOfExperience)
    .slice(0, 3);

  // If nothing overlapped, fall back to the most experienced consultants rather
  // than showing an empty result to someone who just disclosed a difficulty.
  const finalMatches =
    matches.length > 0
      ? matches
      : doctors
          .slice()
          .sort((a, b) => b.yearsOfExperience - a.yearsOfExperience)
          .slice(0, 3)
          .map((doctor) => ({
            id: doctor.id,
            fullName: doctor.user.fullName,
            title: doctor.title,
            matchedConcerns: [] as ConcernTag[],
            matchScore: 0,
            priceOnlineEGP: toEgp(doctor.sessionPriceOnline),
            priceOfflineEGP: toEgp(doctor.sessionPriceOffline),
            yearsOfExperience: doctor.yearsOfExperience,
          }));

  const intake = await prisma.intakeAssessment.create({
    data: {
      patientId: user.id,
      concernsJson: JSON.stringify(input.concerns),
      ageGroup: input.ageGroup,
      therapyHistory: input.therapyHistory,
      medicationHistory: input.medicationHistory,
      genderPreference: input.genderPreference,
      answersJson: JSON.stringify(input.answers),
      severityScore: scored.severityScore,
      maxScore: scored.maxScore,
      urgencyLevel: scored.urgencyLevel,
      crisisFlagged: scored.crisisFlagged,
      matchedDoctorIdsJson: JSON.stringify(finalMatches.map((match) => match.id)),
    },
    select: { id: true },
  });

  await recordAudit({
    actorId: user.id,
    action: "INTAKE_SUBMITTED",
    entityType: "IntakeAssessment",
    entityId: intake.id,
    // Identifiers and bands only — never the free-text or item-level answers.
    metadata: {
      urgencyLevel: scored.urgencyLevel,
      crisisFlagged: scored.crisisFlagged,
      concernCount: input.concerns.length,
    },
  });

  revalidatePath("/dashboard/patient");
  revalidatePath("/dashboard/admin");

  return success({
    intakeId: intake.id,
    severityScore: scored.severityScore,
    maxScore: scored.maxScore,
    urgencyLevel: scored.urgencyLevel,
    crisisFlagged: scored.crisisFlagged,
    matches: finalMatches,
  });
}

// ---------------------------------------------------------------------------
// Staff-facing reads
// ---------------------------------------------------------------------------

export interface IntakeSummary {
  id: string;
  patientName: string;
  patientPhone: string;
  concerns: string[];
  severityScore: number;
  maxScore: number;
  urgencyLevel: string;
  crisisFlagged: boolean;
  reviewedAtUTC: string | null;
  createdAtUTC: string;
}

/** Crisis-flagged and unreviewed intakes, for the clinic's triage queue. */
export async function getFlaggedIntakesAction(
  limit = 25,
): Promise<ActionResult<IntakeSummary[]>> {
  const guard = await requireRole(["ADMIN"]);
  if (!guard.ok) return guard;

  const intakes = await prisma.intakeAssessment.findMany({
    where: { crisisFlagged: true },
    orderBy: [{ reviewedAt: "asc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      concernsJson: true,
      severityScore: true,
      maxScore: true,
      urgencyLevel: true,
      crisisFlagged: true,
      reviewedAt: true,
      createdAt: true,
      patient: { select: { fullName: true, phone: true } },
    },
  });

  return success(
    intakes.map((intake) => ({
      id: intake.id,
      patientName: intake.patient.fullName,
      patientPhone: intake.patient.phone,
      concerns: toStringArray(intake.concernsJson),
      severityScore: intake.severityScore,
      maxScore: intake.maxScore,
      urgencyLevel: intake.urgencyLevel,
      crisisFlagged: intake.crisisFlagged,
      reviewedAtUTC: intake.reviewedAt?.toISOString() ?? null,
      createdAtUTC: intake.createdAt.toISOString(),
    })),
  );
}

/** Mark a flagged intake as handled by the clinic. */
export async function markIntakeReviewedAction(
  _prevState: ActionResult<{ intakeId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ intakeId: string }>> {
  const guard = await requireRole(["ADMIN"], formData);
  if (!guard.ok) return guard;

  const intakeId = String(formData.get("intakeId") ?? "");
  if (!intakeId) return failure("VALIDATION_ERROR", "معرّف غير صالح.", "Invalid identifier.");

  const updated = await prisma.intakeAssessment.updateMany({
    where: { id: intakeId, reviewedAt: null },
    data: { reviewedAt: new Date(), reviewedById: guard.data.user.id },
  });

  if (updated.count === 0) return Failures.notFound("سجل الفرز");

  await recordAudit({
    actorId: guard.data.user.id,
    action: "INTAKE_REVIEWED",
    entityType: "IntakeAssessment",
    entityId: intakeId,
  });

  revalidatePath("/dashboard/admin");
  return success({ intakeId });
}

/** The signed-in patient's own triage history. */
export async function getMyIntakesAction(): Promise<ActionResult<IntakeSummary[]>> {
  const auth = await getAuthContext();
  if (!auth) return Failures.unauthenticated();

  const intakes = await prisma.intakeAssessment.findMany({
    where: { patientId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      concernsJson: true,
      severityScore: true,
      maxScore: true,
      urgencyLevel: true,
      crisisFlagged: true,
      reviewedAt: true,
      createdAt: true,
    },
  });

  return success(
    intakes.map((intake) => ({
      id: intake.id,
      patientName: auth.user.fullName,
      patientPhone: auth.user.phone,
      concerns: toStringArray(intake.concernsJson),
      severityScore: intake.severityScore,
      maxScore: intake.maxScore,
      urgencyLevel: intake.urgencyLevel,
      crisisFlagged: intake.crisisFlagged,
      reviewedAtUTC: intake.reviewedAt?.toISOString() ?? null,
      createdAtUTC: intake.createdAt.toISOString(),
    })),
  );
}
