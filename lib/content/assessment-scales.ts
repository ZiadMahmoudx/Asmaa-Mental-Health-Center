/**
 * Validated clinical screening instruments.
 *
 * Extracted out of the page component so that scoring lives in one place and,
 * critically, so the SERVER can compute the score. The page renders a live
 * preview as the patient answers, but the stored score, severity band and
 * risk flag are always recomputed server-side from the raw answers in
 * `assessments.actions.ts`. A total posted by the client is never trusted:
 * these numbers end up in a clinical record a doctor reads.
 *
 * Pure module — no `server-only`, no icons — so both sides import the same
 * definitions and cannot drift apart.
 *
 * These are the standard public-domain instruments (PHQ-9, GAD-7, ISI). They
 * are screening aids, not diagnoses; every result the platform shows says so.
 */

export const ASSESSMENT_TYPES = ["PHQ9", "GAD7", "ISI"] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export type SeverityBand = "MINIMAL" | "MILD" | "MODERATE" | "MODERATELY_SEVERE" | "SEVERE";

export interface ScaleOption {
  score: number;
  labelAr: string;
  labelEn: string;
}

export interface ScaleQuestion {
  id: string;
  textAr: string;
  textEn: string;
  /**
   * Marks an item whose endorsement is a safety signal in its own right,
   * independent of the total. PHQ-9 item 9 asks about thoughts of self-harm.
   */
  isRiskItem?: boolean;
}

export interface SeverityRule {
  /** Inclusive upper bound of the raw total for this band. */
  maxScore: number;
  band: SeverityBand;
  labelAr: string;
  labelEn: string;
  interpretationAr: string;
  interpretationEn: string;
  /** Tailwind colour key used by the result card. */
  tone: "emerald" | "teal" | "amber" | "orange" | "red";
}

export interface AssessmentScale {
  id: AssessmentType;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  options: ScaleOption[];
  questions: ScaleQuestion[];
  severityRules: SeverityRule[];
}

const FOUR_POINT_FREQUENCY: ScaleOption[] = [
  { score: 0, labelAr: "أبداً", labelEn: "Not at all" },
  { score: 1, labelAr: "عدة أيام", labelEn: "Several days" },
  { score: 2, labelAr: "أكثر من نصف الأيام", labelEn: "More than half the days" },
  { score: 3, labelAr: "كل يوم تقريباً", labelEn: "Nearly every day" },
];

export const ASSESSMENT_SCALES: Record<AssessmentType, AssessmentScale> = {
  PHQ9: {
    id: "PHQ9",
    titleAr: "مقياس الاكتئاب السريري (PHQ-9)",
    titleEn: "PHQ-9 Depression Severity Scale",
    descriptionAr:
      "المقياس المعتمد دولياً لتقييم وجود وشدة الأعراض الاكتئابية خلال الأسبوعين الماضيين.",
    descriptionEn:
      "The validated clinical standard for assessing depression severity over the last 14 days.",
    options: FOUR_POINT_FREQUENCY,
    questions: [
      { id: "p1", textAr: "قلة الاهتمام أو غياب المتعة في ممارسة الأنشطة المعتادة؟", textEn: "Little interest or pleasure in doing things?" },
      { id: "p2", textAr: "الشعور بالإحباط أو الحزن أو اليأس؟", textEn: "Feeling down, depressed, or hopeless?" },
      { id: "p3", textAr: "صعوبة في الاستغراق بالنوم، الاستيقاظ المتكرر، أو النوم المفرط؟", textEn: "Trouble falling or staying asleep, or sleeping too much?" },
      { id: "p4", textAr: "الشعور بالتعب أو انخفاض مستويات الطاقة بشكل مستمر؟", textEn: "Feeling tired or having little energy?" },
      { id: "p5", textAr: "ضعف الشهية للطعام أو الإفراط الشديد في تناول الأكل؟", textEn: "Poor appetite or overeating?" },
      { id: "p6", textAr: "الشعور بالسوء تجاه نفسك أو أنك شخص فاشل أو خذلت أسرتك؟", textEn: "Feeling bad about yourself — or that you are a failure?" },
      { id: "p7", textAr: "صعوبة في التركيز على القراءة أو مشاهدة التلفاز أو العمل؟", textEn: "Trouble concentrating on things such as reading or work?" },
      { id: "p8", textAr: "بطء شديد في الحركة أو الكلام، أو على العكس التململ وكثرة الحركة؟", textEn: "Moving or speaking slowly, or being unusually fidgety/restless?" },
      {
        id: "p9",
        textAr: "أفكار تفيد بأنك تفضل لو أنك مت أو تفكر بإيذاء نفسك؟",
        textEn: "Thoughts that you would be better off dead or hurting yourself?",
        isRiskItem: true,
      },
    ],
    severityRules: [
      { maxScore: 4, band: "MINIMAL", labelAr: "طبيعي / طفيف جداً", labelEn: "Minimal", interpretationAr: "لا تظهر مؤشرات اكتئابية ذات دلالة سريرية. حافظ على عاداتك الصحية.", interpretationEn: "No clinically significant depressive symptoms.", tone: "emerald" },
      { maxScore: 9, band: "MILD", labelAr: "اكتئاب خفيف", labelEn: "Mild", interpretationAr: "أعراض اكتئابية خفيفة. قد تستفيد من جلسات الدعم النفسي وتنظيم نمط الحياة.", interpretationEn: "Mild depressive symptoms that may benefit from supportive therapy.", tone: "teal" },
      { maxScore: 14, band: "MODERATE", labelAr: "اكتئاب متوسط", labelEn: "Moderate", interpretationAr: "توصي البروتوكولات الطبية بجلسات علاج معرفي سلوكي (CBT) منتظمة.", interpretationEn: "Moderate depression. Structured CBT is recommended.", tone: "amber" },
      { maxScore: 19, band: "MODERATELY_SEVERE", labelAr: "اكتئاب فوق المتوسط", labelEn: "Moderately severe", interpretationAr: "توصي الجمعيات الطبية بخطة علاجية تجمع بين جلسات الـ CBT والاستشارة الدوائية.", interpretationEn: "Moderately severe depression. Combined pharmacotherapy and psychotherapy advised.", tone: "orange" },
      { maxScore: 27, band: "SEVERE", labelAr: "اكتئاب حاد", labelEn: "Severe", interpretationAr: "أعراض اكتئابية شديدة تستلزم تدخلاً استشارياً عاجلاً ومتابعة طبية دقيقة.", interpretationEn: "Severe depression requiring immediate comprehensive psychiatric evaluation.", tone: "red" },
    ],
  },

  GAD7: {
    id: "GAD7",
    titleAr: "مقياس القلق المعمم (GAD-7)",
    titleEn: "GAD-7 Generalized Anxiety Scale",
    descriptionAr: "مقياس الفحص الإكلينيكي المعتمد لتقييم القلق المعمم ونوبات التوتر.",
    descriptionEn: "Clinical screening tool for generalized anxiety and somatic worry.",
    options: FOUR_POINT_FREQUENCY,
    questions: [
      { id: "g1", textAr: "الشعور بالعصبية أو التوتر أو أنك على الحافة؟", textEn: "Feeling nervous, anxious, or on edge?" },
      { id: "g2", textAr: "عدم القدرة على التوقف عن القلق أو السيطرة عليه؟", textEn: "Not being able to stop or control worrying?" },
      { id: "g3", textAr: "القلق المفرط بشأن أمور ومواقف متعددة ومختلفة؟", textEn: "Worrying too much about different things?" },
      { id: "g4", textAr: "صعوبة بالغة في الاسترخاء وتهدئة الأعصاب؟", textEn: "Trouble relaxing?" },
      { id: "g5", textAr: "الشعور بالتململ الشديد لدرجة صعوبة الجلوس في مكانك؟", textEn: "Being so restless that it is hard to sit still?" },
      { id: "g6", textAr: "سرعة الانفعال والغضب لأبسط الأسباب؟", textEn: "Becoming easily annoyed or irritable?" },
      { id: "g7", textAr: "الشعور بالخوف كأن شيئاً مروعاً وكارثياً على وشك الحدوث؟", textEn: "Feeling afraid as if something awful might happen?" },
    ],
    severityRules: [
      { maxScore: 4, band: "MINIMAL", labelAr: "قلق طبيعي / طفيف", labelEn: "Minimal", interpretationAr: "مستويات القلق لديك في النطاق الطبيعي الصحي.", interpretationEn: "Anxiety is within normal baseline.", tone: "emerald" },
      { maxScore: 9, band: "MILD", labelAr: "قلق خفيف", labelEn: "Mild", interpretationAr: "توتر خفيف. تساعد تمارين التنفس واليقظة الذهنية على تفريغ الشحنات.", interpretationEn: "Mild anxiety. Relaxation techniques are effective.", tone: "teal" },
      { maxScore: 14, band: "MODERATE", labelAr: "قلق متوسط", labelEn: "Moderate", interpretationAr: "قلق يؤثر على يومك. ينصح ببدء خطة علاج معرفي سلوكي مع أحد استشاريينا.", interpretationEn: "Moderate anxiety. CBT counseling recommended.", tone: "amber" },
      { maxScore: 21, band: "SEVERE", labelAr: "قلق شديد", labelEn: "Severe", interpretationAr: "قلق مرتفع ومستمر يسبب استنزافاً كبيراً. ينصح باستشارة طبية عاجلة.", interpretationEn: "Severe anxiety requiring specialized psychiatric intervention.", tone: "red" },
    ],
  },

  ISI: {
    id: "ISI",
    titleAr: "مؤشر شدة الأرق وجودة النوم (ISI)",
    titleEn: "Insomnia Severity Index (ISI)",
    descriptionAr: "تقييم إكلينيكي لدرجة الأرق ومدى تأثيره على الوظائف النهارية والطاقة.",
    descriptionEn: "Clinical assessment of insomnia nature, severity, and daytime impairment.",
    options: [
      { score: 0, labelAr: "لا يوجد", labelEn: "None" },
      { score: 1, labelAr: "خفيف", labelEn: "Mild" },
      { score: 2, labelAr: "متوسط", labelEn: "Moderate" },
      { score: 3, labelAr: "شديد", labelEn: "Severe" },
      { score: 4, labelAr: "شديد جداً", labelEn: "Very severe" },
    ],
    questions: [
      { id: "i1", textAr: "صعوبة الاستغراق في النوم في بداية الليل؟", textEn: "Difficulty falling asleep?" },
      { id: "i2", textAr: "الاستيقاظ المتكرر أثناء النوم وصعوبة العودة للنوم؟", textEn: "Difficulty staying asleep?" },
      { id: "i3", textAr: "الاستيقاظ المبكر جداً قبل الوقت المرغوب؟", textEn: "Problems waking up too early?" },
      { id: "i4", textAr: "ما مدى رضاك عن جودة ونمط نومك الحالي؟", textEn: "How satisfied are you with your current sleep pattern?" },
      { id: "i5", textAr: "مدى ملاحظة الآخرين لتأثير قلة النوم على طاقتك ومزاجك؟", textEn: "How noticeable to others is your sleep problem?" },
      { id: "i6", textAr: "مدى قلقك وانشغالك بمشكلة النوم الحالية؟", textEn: "How worried are you about your current sleep problem?" },
      { id: "i7", textAr: "مدى تأثير الأرق على أدائك اليومي بالعمل أو الدراسة؟", textEn: "How much does it interfere with your daily functioning?" },
    ],
    severityRules: [
      { maxScore: 7, band: "MINIMAL", labelAr: "لا يوجد أرق ملحوظ", labelEn: "No insomnia", interpretationAr: "نمط نومك سليم ومنتظم.", interpretationEn: "Normal healthy sleep architecture.", tone: "emerald" },
      { maxScore: 14, band: "MILD", labelAr: "أرق تحت سريري (خفيف)", labelEn: "Subthreshold", interpretationAr: "صعوبات نوم عارضة. ننصح ببروتوكولات نظافة النوم (Sleep Hygiene).", interpretationEn: "Mild sleep disturbance.", tone: "teal" },
      { maxScore: 21, band: "MODERATE", labelAr: "أرق سريري متوسط", labelEn: "Moderate clinical", interpretationAr: "ينصح ببرنامج العلاج السلوكي المعرفي للأرق (CBT-I).", interpretationEn: "Moderate clinical insomnia. CBT-I is indicated.", tone: "amber" },
      { maxScore: 28, band: "SEVERE", labelAr: "أرق سريري حاد", labelEn: "Severe clinical", interpretationAr: "أرق حاد يؤثر بشدة على صحتك العصبية. ينصح باستشارة طبيب نفسي فوراً.", interpretationEn: "Severe insomnia requiring comprehensive evaluation.", tone: "red" },
    ],
  },
};

export function isAssessmentType(value: string): value is AssessmentType {
  return (ASSESSMENT_TYPES as readonly string[]).includes(value);
}

/** Highest possible raw total, derived rather than hard-coded. */
export function maxScoreFor(scale: AssessmentScale): number {
  const highestOption = Math.max(...scale.options.map((option) => option.score));
  return highestOption * scale.questions.length;
}

export interface ScoredAssessment {
  totalScore: number;
  maxScore: number;
  band: SeverityBand;
  labelAr: string;
  labelEn: string;
  interpretationAr: string;
  interpretationEn: string;
  tone: SeverityRule["tone"];
  /**
   * True when a safety-flagged item was endorsed at all (score > 0). Surfaced
   * to the patient as crisis resources and to the clinic as a triage signal,
   * regardless of how low the total is — a low total with item 9 endorsed still
   * warrants attention.
   */
  riskItemEndorsed: boolean;
}

/**
 * Score a completed scale. Answers are keyed by question id; unanswered
 * questions count as zero, and out-of-range values are clamped to the scale's
 * own option set rather than trusted.
 */
export function scoreAssessment(
  scale: AssessmentScale,
  answers: Record<string, number>,
): ScoredAssessment {
  const validScores = new Set(scale.options.map((option) => option.score));

  let totalScore = 0;
  let riskItemEndorsed = false;

  for (const question of scale.questions) {
    const raw = answers[question.id];
    const value = typeof raw === "number" && validScores.has(raw) ? raw : 0;
    totalScore += value;
    if (question.isRiskItem && value > 0) riskItemEndorsed = true;
  }

  // Rules are ordered by ascending maxScore; the first match is the band.
  const rule =
    scale.severityRules.find((candidate) => totalScore <= candidate.maxScore) ??
    scale.severityRules[scale.severityRules.length - 1]!;

  return {
    totalScore,
    maxScore: maxScoreFor(scale),
    band: rule.band,
    labelAr: rule.labelAr,
    labelEn: rule.labelEn,
    interpretationAr: rule.interpretationAr,
    interpretationEn: rule.interpretationEn,
    tone: rule.tone,
    riskItemEndorsed,
  };
}
