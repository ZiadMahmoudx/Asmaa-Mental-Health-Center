"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ActionResult, Failures, failure, success } from "@/lib/result";
import { requireRole } from "@/lib/auth/guards";
import { getAuthContext } from "@/lib/auth/session";
import { recordAudit } from "@/lib/security/audit";
import { toStringArray } from "@/lib/serialization";
import { toFieldErrors } from "@/lib/validation/schemas";

/**
 * Stanley-Brown safety plan.
 *
 * A safety plan is the document a patient reaches for at the worst moment, so
 * two decisions follow from that:
 *
 *  - **One live plan per patient, revised in place.** Not a history. When
 *    someone opens this in crisis they need the current version immediately,
 *    not a list of drafts to choose between.
 *  - **Every section is optional and it saves anyway.** A half-finished plan
 *    that exists beats a complete one the patient abandoned at step four
 *    because the form refused to save.
 *
 * The plan belongs to the patient. It is stored server-side (the previous
 * version lived only in component state and evaporated on refresh), and the
 * treating doctor can read it — a safety plan the clinician cannot see does
 * only half its job.
 */

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => v || undefined),
  relationship: z.string().trim().max(80).optional().or(z.literal("")).transform((v) => v || undefined),
});

export type SafetyContact = z.infer<typeof contactSchema>;

/** Free-text list sections: trimmed, de-duplicated, capped. */
const listSchema = z
  .array(z.string().trim().min(1).max(300))
  .max(15)
  .transform((items) => [...new Set(items)]);

const safetyPlanSchema = z.object({
  warningSigns: listSchema,
  copingStrategies: listSchema,
  socialDistractions: listSchema,
  trustedContacts: z.array(contactSchema).max(10),
  professionalContacts: z.array(contactSchema).max(10),
  environmentSteps: listSchema,
  reasonsForLiving: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
});

export interface SafetyPlanView {
  warningSigns: string[];
  copingStrategies: string[];
  socialDistractions: string[];
  trustedContacts: SafetyContact[];
  professionalContacts: SafetyContact[];
  environmentSteps: string[];
  reasonsForLiving: string | null;
  updatedAtUTC: string | null;
}

const EMPTY_PLAN: SafetyPlanView = {
  warningSigns: [],
  copingStrategies: [],
  socialDistractions: [],
  trustedContacts: [],
  professionalContacts: [],
  environmentSteps: [],
  reasonsForLiving: null,
  updatedAtUTC: null,
};

/** Parse a JSON contact column defensively — a malformed row must not 500. */
function toContacts(raw: string): SafetyContact[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      const result = contactSchema.safeParse(entry);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

/** The signed-in patient's plan; an empty shell when none exists yet. */
export async function getMySafetyPlanAction(): Promise<ActionResult<SafetyPlanView>> {
  const auth = await getAuthContext();
  if (!auth) return Failures.unauthenticated();

  const plan = await prisma.safetyPlan.findUnique({
    where: { patientId: auth.user.id },
  });

  if (!plan) return success(EMPTY_PLAN);

  return success({
    warningSigns: toStringArray(plan.warningSignsJson),
    copingStrategies: toStringArray(plan.copingStrategiesJson),
    socialDistractions: toStringArray(plan.socialDistractionsJson),
    trustedContacts: toContacts(plan.trustedContactsJson),
    professionalContacts: toContacts(plan.professionalContactsJson),
    environmentSteps: toStringArray(plan.environmentStepsJson),
    reasonsForLiving: plan.reasonsForLiving,
    updatedAtUTC: plan.updatedAt.toISOString(),
  });
}

/**
 * Create or revise the plan. Upsert keyed on the patient, so saving twice
 * revises rather than duplicating.
 */
export async function saveSafetyPlanAction(
  _prevState: ActionResult<SafetyPlanView> | null,
  formData: FormData,
): Promise<ActionResult<SafetyPlanView>> {
  const guard = await requireRole(["PATIENT"], formData);
  if (!guard.ok) return guard;
  const { user } = guard.data;

  // Repeated fields arrive as one entry per row in the UI.
  const parsed = safetyPlanSchema.safeParse({
    warningSigns: formData.getAll("warningSigns").map(String).filter(Boolean),
    copingStrategies: formData.getAll("copingStrategies").map(String).filter(Boolean),
    socialDistractions: formData.getAll("socialDistractions").map(String).filter(Boolean),
    environmentSteps: formData.getAll("environmentSteps").map(String).filter(Boolean),
    trustedContacts: formData
      .getAll("trustedContacts")
      .map(String)
      .filter(Boolean)
      .flatMap((entry) => {
        try {
          return [JSON.parse(entry)];
        } catch {
          return [];
        }
      }),
    professionalContacts: formData
      .getAll("professionalContacts")
      .map(String)
      .filter(Boolean)
      .flatMap((entry) => {
        try {
          return [JSON.parse(entry)];
        } catch {
          return [];
        }
      }),
    reasonsForLiving: formData.get("reasonsForLiving") ?? "",
  });

  if (!parsed.success) {
    return failure(
      "VALIDATION_ERROR",
      "تعذّر حفظ خطة الأمان. يرجى مراجعة المدخلات.",
      "Could not save the safety plan. Please review your entries.",
      toFieldErrors(parsed.error),
    );
  }

  const input = parsed.data;

  const data = {
    warningSignsJson: JSON.stringify(input.warningSigns),
    copingStrategiesJson: JSON.stringify(input.copingStrategies),
    socialDistractionsJson: JSON.stringify(input.socialDistractions),
    trustedContactsJson: JSON.stringify(input.trustedContacts),
    professionalContactsJson: JSON.stringify(input.professionalContacts),
    environmentStepsJson: JSON.stringify(input.environmentSteps),
    reasonsForLiving: input.reasonsForLiving ?? null,
  };

  const plan = await prisma.safetyPlan.upsert({
    where: { patientId: user.id },
    create: { patientId: user.id, ...data },
    update: data,
    select: { updatedAt: true },
  });

  await recordAudit({
    actorId: user.id,
    action: "SAFETY_PLAN_SAVED",
    entityType: "SafetyPlan",
    entityId: user.id,
    // Section counts only. The contents of a safety plan are among the most
    // sensitive text on the platform and never enter the audit trail.
    metadata: {
      warningSigns: input.warningSigns.length,
      copingStrategies: input.copingStrategies.length,
      trustedContacts: input.trustedContacts.length,
    },
  });

  revalidatePath("/safety-plan");
  revalidatePath("/dashboard/patient");

  return success({
    warningSigns: input.warningSigns,
    copingStrategies: input.copingStrategies,
    socialDistractions: input.socialDistractions,
    trustedContacts: input.trustedContacts,
    professionalContacts: input.professionalContacts,
    environmentSteps: input.environmentSteps,
    reasonsForLiving: input.reasonsForLiving ?? null,
    updatedAtUTC: plan.updatedAt.toISOString(),
  });
}

/**
 * A patient's plan, for the treating doctor. Scoped to patients this doctor has
 * an appointment with, and audited on every read.
 */
export async function getPatientSafetyPlanAction(
  patientId: string,
): Promise<ActionResult<SafetyPlanView>> {
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

  const plan = await prisma.safetyPlan.findUnique({ where: { patientId } });
  if (!plan) return success(EMPTY_PLAN);

  await recordAudit({
    actorId: guard.data.user.id,
    action: "SAFETY_PLAN_VIEWED",
    entityType: "SafetyPlan",
    entityId: patientId,
  });

  return success({
    warningSigns: toStringArray(plan.warningSignsJson),
    copingStrategies: toStringArray(plan.copingStrategiesJson),
    socialDistractions: toStringArray(plan.socialDistractionsJson),
    trustedContacts: toContacts(plan.trustedContactsJson),
    professionalContacts: toContacts(plan.professionalContactsJson),
    environmentSteps: toStringArray(plan.environmentStepsJson),
    reasonsForLiving: plan.reasonsForLiving,
    updatedAtUTC: plan.updatedAt.toISOString(),
  });
}
