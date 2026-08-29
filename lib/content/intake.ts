/**
 * Clinical intake (triage) content.
 *
 * Replaces `data/mockIntakeQuestions.ts`. Two substantive changes beyond the
 * move:
 *
 *  1. Concerns no longer carry `matchedDoctorIds: ["doc-1", ...]`. Those were
 *     mock identifiers that do not exist in the database, so doctor matching was
 *     silently broken. A concern now carries a `tag`, and each DoctorProfile
 *     stores the tags it treats (`concernTagsJson`), so matching is a real join
 *     against real consultants and keeps working as the clinic hires.
 *
 *  2. The screening block is scored on the server. `isCrisis` on an option is
 *     the authoritative crisis signal, and `scoreIntake` below is what both the
 *     live preview and the stored record use.
 *
 * Pure module: shared by the intake page and by intake.actions.ts.
 */

export const CONCERN_TAGS = [
  "anxiety",
  "panic",
  "depression",
  "ocd",
  "trauma",
  "relationships",
  "adhd",
  "sleep",
  "addiction",
  "burnout",
] as const;

export type ConcernTag = (typeof CONCERN_TAGS)[number];

export interface ConcernOption {
  tag: ConcernTag;
  labelAr: string;
  labelEn: string;
  /** lucide-react icon name; resolved in the page, kept out of this module. */
  iconName: string;
}

export const CONCERNS: ConcernOption[] = [
  { tag: "anxiety", labelAr: "القلق والتوتر الدائم", labelEn: "Chronic anxiety & tension", iconName: "Activity" },
  { tag: "panic", labelAr: "نوبات الهلع المفاجئة", labelEn: "Sudden panic attacks", iconName: "Zap" },
  { tag: "depression", labelAr: "الحزن وفقدان الشغف (الاكتئاب)", labelEn: "Depression & loss of joy", iconName: "CloudRain" },
  { tag: "ocd", labelAr: "الأفكار والوساوس القهرية", labelEn: "Obsessive thoughts (OCD)", iconName: "Repeat" },
  { tag: "trauma", labelAr: "الصدمات النفسية والفقد", labelEn: "Trauma, PTSD & grief", iconName: "HeartCrack" },
  { tag: "relationships", labelAr: "المشاكل الزوجية والعلاقات", labelEn: "Couples & relationship conflict", iconName: "Users" },
  { tag: "adhd", labelAr: "تشتت الانتباه وفرط الحركة (ADHD)", labelEn: "Adult ADHD & focus", iconName: "BrainCircuit" },
  { tag: "sleep", labelAr: "الأرق وصعوبة النوم", labelEn: "Insomnia & sleep disruption", iconName: "Moon" },
  { tag: "addiction", labelAr: "الإدمان السلوكي والمواد", labelEn: "Substance & behavioural addiction", iconName: "ShieldAlert" },
  { tag: "burnout", labelAr: "الاحتراق النفسي وضغوط العمل", labelEn: "Workplace burnout & stress", iconName: "Flame" },
];

export function isConcernTag(value: string): value is ConcernTag {
  return (CONCERN_TAGS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Context options
// ---------------------------------------------------------------------------

export const AGE_GROUPS = ["UNDER_18", "18-24", "25-34", "35-44", "45-54", "55_PLUS"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const AGE_GROUP_LABELS: Record<AgeGroup, { ar: string; en: string }> = {
  UNDER_18: { ar: "أقل من 18 سنة", en: "Under 18" },
  "18-24": { ar: "18 – 24 سنة", en: "18 – 24" },
  "25-34": { ar: "25 – 34 سنة", en: "25 – 34" },
  "35-44": { ar: "35 – 44 سنة", en: "35 – 44" },
  "45-54": { ar: "45 – 54 سنة", en: "45 – 54" },
  "55_PLUS": { ar: "55 سنة فأكثر", en: "55+" },
};

export const THERAPY_HISTORY = ["FIRST_TIME", "PAST_THERAPY", "CURRENTLY_IN_THERAPY"] as const;
export type TherapyHistory = (typeof THERAPY_HISTORY)[number];

export const THERAPY_HISTORY_LABELS: Record<TherapyHistory, { ar: string; en: string }> = {
  FIRST_TIME: { ar: "هذه أول تجربة علاجية لي", en: "This is my first time" },
  PAST_THERAPY: { ar: "سبق لي العلاج النفسي في الماضي", en: "I have had therapy before" },
  CURRENTLY_IN_THERAPY: { ar: "أنا متابع حالياً مع معالج آخر", en: "I am currently in therapy" },
};

export const MEDICATION_HISTORY = ["NONE", "PAST", "CURRENT"] as const;
export type MedicationHistory = (typeof MEDICATION_HISTORY)[number];

export const MEDICATION_HISTORY_LABELS: Record<MedicationHistory, { ar: string; en: string }> = {
  NONE: { ar: "لم أتناول أدوية نفسية من قبل", en: "Never taken psychiatric medication" },
  PAST: { ar: "تناولت أدوية نفسية سابقاً وتوقفت", en: "Taken in the past, now stopped" },
  CURRENT: { ar: "أتناول أدوية نفسية حالياً", en: "Currently taking medication" },
};

export const GENDER_PREFERENCES = ["ANY", "MALE", "FEMALE"] as const;
export type GenderPreference = (typeof GENDER_PREFERENCES)[number];

export const GENDER_PREFERENCE_LABELS: Record<GenderPreference, { ar: string; en: string }> = {
  ANY: { ar: "لا يوجد تفضيل", en: "No preference" },
  MALE: { ar: "أفضّل استشاري رجل", en: "Prefer a male consultant" },
  FEMALE: { ar: "أفضّل استشارية سيدة", en: "Prefer a female consultant" },
};

// ---------------------------------------------------------------------------
// Screening block
// ---------------------------------------------------------------------------

export interface ScreeningOption {
  score: number;
  textAr: string;
  textEn: string;
  /** Endorsing this option routes the patient to crisis resources immediately. */
  isCrisis?: boolean;
}

export interface ScreeningQuestion {
  id: string;
  textAr: string;
  textEn: string;
  options: ScreeningOption[];
}

export const SCREENING_QUESTIONS: ScreeningQuestion[] = [
  {
    id: "q1",
    textAr: "خلال الأسبوعين الماضيين، كم مرة شعرت بقلة الاهتمام أو غياب المتعة في ممارسة أنشطتك المعتادة؟",
    textEn: "Over the last 2 weeks, how often have you had little interest or pleasure in doing things?",
    options: [
      { score: 0, textAr: "أبداً (0 أيام)", textEn: "Not at all" },
      { score: 1, textAr: "عدة أيام (1-6 أيام)", textEn: "Several days" },
      { score: 2, textAr: "أكثر من نصف الأيام (7-11 يوماً)", textEn: "More than half the days" },
      { score: 3, textAr: "كل يوم تقريباً (12-14 يوماً)", textEn: "Nearly every day" },
    ],
  },
  {
    id: "q2",
    textAr: "كم مرة شعرت بالتوتر، القلق الشديد، أو أنك على حافة الانهيار العصبي؟",
    textEn: "How often have you felt nervous, anxious, or on edge?",
    options: [
      { score: 0, textAr: "أبداً", textEn: "Not at all" },
      { score: 1, textAr: "أيام قليلة", textEn: "Several days" },
      { score: 2, textAr: "معظم الأيام", textEn: "More than half the days" },
      { score: 3, textAr: "بشكل يومي ومستمر", textEn: "Nearly every day" },
    ],
  },
  {
    id: "q3",
    textAr: "كيف تقيّم مدى تأثير هذه الصعوبات على قدرتك على العمل، الدراسة، أو إدارة علاقاتك؟",
    textEn: "How difficult have these problems made it to work, study, or handle relationships?",
    options: [
      { score: 0, textAr: "لا يوجد تأثير ملحوظ", textEn: "Not difficult at all" },
      { score: 1, textAr: "تأثير خفيف يمكن التكيف معه", textEn: "Somewhat difficult" },
      { score: 2, textAr: "تأثير ملحوظ يعطل بعض المهام", textEn: "Very difficult" },
      { score: 3, textAr: "تأثير شديد يعيق الحياة اليومية تماماً", textEn: "Extremely difficult" },
    ],
  },
  {
    id: "q4_crisis",
    textAr: "هل تراودك أفكار لإيذاء نفسك أو تشعر بأنك تفضل عدم الاستيقاظ غداً؟",
    textEn: "Have you had thoughts that you would be better off dead, or of hurting yourself?",
    options: [
      { score: 0, textAr: "لا على الإطلاق", textEn: "Never / not at all" },
      { score: 1, textAr: "أفكار عابرة جداً دون أي رغبة في التنفيذ", textEn: "Passing thought with no intent" },
      { score: 3, textAr: "نعم، تراودني أفكار ملحة وأشعر بضيق شديد", textEn: "Yes, persistent distressing thoughts", isCrisis: true },
    ],
  },
];

export const SCREENING_MAX_SCORE = SCREENING_QUESTIONS.reduce(
  (total, question) => total + Math.max(...question.options.map((option) => option.score)),
  0,
);

// ---------------------------------------------------------------------------
// Triage scoring
// ---------------------------------------------------------------------------

export const URGENCY_LEVELS = ["STABLE", "EVALUATE", "CRISIS_EMERGENCY"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export interface ScoredIntake {
  severityScore: number;
  maxScore: number;
  urgencyLevel: UrgencyLevel;
  /** True when a crisis-flagged option was selected, whatever the total. */
  crisisFlagged: boolean;
}

/**
 * Triage an intake. Crisis is a hard override: endorsing the safety item routes
 * to emergency resources regardless of how low the rest of the score is, because
 * a patient can be functioning well on every other axis and still be in danger.
 */
export function scoreIntake(answers: Record<string, number>): ScoredIntake {
  let severityScore = 0;
  let crisisFlagged = false;

  for (const question of SCREENING_QUESTIONS) {
    const raw = answers[question.id];
    const option = question.options.find((candidate) => candidate.score === raw);
    if (!option) continue;

    severityScore += option.score;
    if (option.isCrisis) crisisFlagged = true;
  }

  const urgencyLevel: UrgencyLevel = crisisFlagged
    ? "CRISIS_EMERGENCY"
    : severityScore >= 5
      ? "EVALUATE"
      : "STABLE";

  return { severityScore, maxScore: SCREENING_MAX_SCORE, urgencyLevel, crisisFlagged };
}
