/**
 * Validated clinical screening instruments.
 *
 * Scoring lives in one place and is strictly computed server-side in `assessments.actions.ts`.
 * A total posted by the client is never trusted: these numbers end up in clinical records
 * and patient safety queues.
 *
 * Pure module — no `server-only`, no client hooks — so both client and server import the same
 * definitions and stay in sync.
 *
 * Instruments included:
 * - PHQ-9 (Depression, 9 items) - Public domain (Pfizer grant)
 * - GAD-7 (Anxiety, 7 items) - Public domain
 * - ISI (Insomnia Severity Index, 7 items)
 * - PCL-5 (PTSD Checklist for DSM-5, 20 items) - Public domain (US VA)
 * - OCI-R (Obsessive-Compulsive Inventory–Revised, 18 items) - Public domain
 * - AUDIT (Alcohol Use Disorders Identification Test, 10 items) - WHO
 * - DAST-10 (Drug Abuse Screening Test, 10 items) - WHO / CAMH
 * - ASRS v1.1 (Adult ADHD Self-Report Scale Screener, 6 items) - WHO
 */

import { ASSESSMENT_TYPES, AssessmentType } from "@/lib/domain/enums";

export { ASSESSMENT_TYPES, type AssessmentType };

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
  /** Optional per-question option set override (e.g. AUDIT items 9-10 vs 1-8). */
  options?: ScaleOption[];
  /** Optional hint or contextual prompt for the question. */
  hintAr?: string;
  hintEn?: string;
  /** Legacy single-item flag; modern scales use scale-level riskRules. */
  isRiskItem?: boolean;
}

export interface ScaleSubscale {
  key: string;
  labelAr: string;
  labelEn: string;
  questionIds: string[];
}

export interface ScaleRiskRule {
  questionIds: string[];
  minScore: number;
  severity: "CRISIS" | "ELEVATED";
  reasonAr: string;
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
  version: number;
  titleAr: string;
  titleEn: string;
  category: "DEPRESSION" | "ANXIETY" | "SLEEP" | "TRAUMA" | "OCD" | "ADDICTION" | "ADHD";
  descriptionAr: string;
  descriptionEn: string;
  timeframeAr: string;
  timeframeEn: string;
  options: ScaleOption[];
  questions: ScaleQuestion[];
  subscales?: ScaleSubscale[];
  riskRules?: ScaleRiskRule[];
  scoringStrategy?: "SUM" | "DOMAIN_MAX" | "THRESHOLD_COUNT";
  severityRules: SeverityRule[];
}

// ---------------------------------------------------------------------------
// Standard Option Sets
// ---------------------------------------------------------------------------

const FOUR_POINT_FREQUENCY: ScaleOption[] = [
  { score: 0, labelAr: "أبداً", labelEn: "Not at all" },
  { score: 1, labelAr: "عدة أيام", labelEn: "Several days" },
  { score: 2, labelAr: "أكثر من نصف الأيام", labelEn: "More than half the days" },
  { score: 3, labelAr: "كل يوم تقريباً", labelEn: "Nearly every day" },
];

const FIVE_POINT_DISTRESS: ScaleOption[] = [
  { score: 0, labelAr: "على الإطلاق", labelEn: "Not at all" },
  { score: 1, labelAr: "قليلاً", labelEn: "A little bit" },
  { score: 2, labelAr: "بدرجة معتدلة", labelEn: "Moderately" },
  { score: 3, labelAr: "بدرجة كبيرة", labelEn: "Quite a bit" },
  { score: 4, labelAr: "بدرجة شديدة جداً", labelEn: "Extremely" },
];

const BINARY_YES_NO: ScaleOption[] = [
  { score: 0, labelAr: "لا", labelEn: "No" },
  { score: 1, labelAr: "نعم", labelEn: "Yes" },
];

// ---------------------------------------------------------------------------
// Scales Catalog
// ---------------------------------------------------------------------------

export const ASSESSMENT_SCALES: Record<AssessmentType, AssessmentScale> = {
  PHQ9: {
    id: "PHQ9",
    version: 1,
    category: "DEPRESSION",
    titleAr: "مقياس الاكتئاب السريري (PHQ-9)",
    titleEn: "PHQ-9 Depression Severity Scale",
    descriptionAr: "المقياس المعتمد دولياً لتقييم وجود وشدة الأعراض الاكتئابية ومتابعة الاستجابة للعلاج.",
    descriptionEn: "The validated clinical standard for assessing depression severity over the last 14 days.",
    timeframeAr: "خلال الأسبوعين الماضيين",
    timeframeEn: "Over the last 2 weeks",
    options: FOUR_POINT_FREQUENCY,
    questions: [
      { id: "p1", textAr: "قلة الاهتمام أو غياب المتعة في ممارسة الأنشطة المعتادة؟", textEn: "Little interest or pleasure in doing things?" },
      { id: "p2", textAr: "الشعور بالإحباط أو الحزن أو اليأس؟", textEn: "Feeling down, depressed, or hopeless?" },
      { id: "p3", textAr: "صعوبة في الاستغراق بالنوم، الاستيقاظ المتكرر، أو النوم المفرط؟", textEn: "Trouble falling or staying asleep, or sleeping too much?" },
      { id: "p4", textAr: "الشعور بالتعب أو انخفاض مستويات الطاقة بشكل مستمر؟", textEn: "Feeling tired or having little energy?" },
      { id: "p5", textAr: "ضعف الشهية للطعام أو الإفراط الشديد في تناول الأكل؟", textEn: "Poor appetite or overeating?" },
      { id: "p6", textAr: "الشعور بالسوء تجاه نفسك أو أنك شخص فاشل أو خذلت أسرتك؟", textEn: "Feeling bad about yourself — or that you are a failure?" },
      { id: "p7", textAr: "صعوبة في التركيز على القراءة أو العمل أو متابعة المحادثات؟", textEn: "Trouble concentrating on things such as reading or work?" },
      { id: "p8", textAr: "بطء شديد في الحركة أو الكلام، أو على العكس التململ وكثرة الحركة؟", textEn: "Moving or speaking slowly, or being unusually fidgety/restless?" },
      {
        id: "p9",
        textAr: "أفكار تفيد بأنك تفضل لو أنك مت أو تفكر بإيذاء نفسك بأي شكل؟",
        textEn: "Thoughts that you would be better off dead or hurting yourself in some way?",
        isRiskItem: true,
      },
    ],
    riskRules: [
      {
        questionIds: ["p9"],
        minScore: 1,
        severity: "CRISIS",
        reasonAr: "تم الإفصاح عن أفكار إيذاء النفس في مقياس الاكتئاب (السؤال 9)",
      },
    ],
    severityRules: [
      { maxScore: 4, band: "MINIMAL", labelAr: "طبيعي / طفيف جداً", labelEn: "Minimal", interpretationAr: "لا تظهر مؤشرات اكتئابية ذات دلالة سريرية.", interpretationEn: "No clinically significant depressive symptoms.", tone: "emerald" },
      { maxScore: 9, band: "MILD", labelAr: "اكتئاب خفيف", labelEn: "Mild", interpretationAr: "أعراض اكتئابية خفيفة. قد تستفيد من جلسات الدعم النفسي وتنظيم نمط الحياة.", interpretationEn: "Mild depressive symptoms that may benefit from supportive therapy.", tone: "teal" },
      { maxScore: 14, band: "MODERATE", labelAr: "اكتئاب متوسط", labelEn: "Moderate", interpretationAr: "توصي البروتوكولات الطبية بجلسات علاج معرفي سلوكي (CBT) منتظمة.", interpretationEn: "Moderate depression. Structured CBT is recommended.", tone: "amber" },
      { maxScore: 19, band: "MODERATELY_SEVERE", labelAr: "اكتئاب فوق المتوسط", labelEn: "Moderately severe", interpretationAr: "توصي الجمعيات الطبية بخطة علاجية تجمع بين جلسات الـ CBT والاستشارة الدوائية.", interpretationEn: "Moderately severe depression. Combined psychotherapy advised.", tone: "orange" },
      { maxScore: 27, band: "SEVERE", labelAr: "اكتئاب حاد", labelEn: "Severe", interpretationAr: "أعراض اكتئابية شديدة تستلزم تدخلاً استشارياً عاجلاً ومتابعة طبية دقيقة.", interpretationEn: "Severe depression requiring immediate comprehensive psychiatric evaluation.", tone: "red" },
    ],
  },

  GAD7: {
    id: "GAD7",
    version: 1,
    category: "ANXIETY",
    titleAr: "مقياس القلق المعمم (GAD-7)",
    titleEn: "GAD-7 Generalized Anxiety Scale",
    descriptionAr: "مقياس الفحص الإكلينيكي المعتمد لتقييم القلق المعمم ونوبات التوتر المستمر.",
    descriptionEn: "Clinical screening tool for generalized anxiety and somatic worry.",
    timeframeAr: "خلال الأسبوعين الماضيين",
    timeframeEn: "Over the last 2 weeks",
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
    version: 1,
    category: "SLEEP",
    titleAr: "مؤشر شدة الأرق وجودة النوم (ISI)",
    titleEn: "Insomnia Severity Index (ISI)",
    descriptionAr: "تقييم إكلينيكي لدرجة الأرق ومدى تأثيره على الوظائف النهارية والتركيز.",
    descriptionEn: "Clinical assessment of insomnia nature, severity, and daytime impairment.",
    timeframeAr: "خلال الأسبوعين الماضيين",
    timeframeEn: "Over the last 2 weeks",
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
      { id: "i4", textAr: "ما مدى رضاك أو عدم رضاك عن نمط ونوعية نومك الحالي؟", textEn: "How satisfied/dissatisfied are you with your current sleep pattern?" },
      { id: "i5", textAr: "مدى ملاحظة الآخرين لتأثير مشكلة النوم على جودة حياتك وطاقتك؟", textEn: "How noticeable to others is your sleep problem?" },
      { id: "i6", textAr: "مدى قلقك أو انشغالك بمشكلة النوم الحالية؟", textEn: "How worried/distressed are you about your current sleep problem?" },
      { id: "i7", textAr: "مدى تأثير الأرق على أدائك اليومي بالعمل أو الدراسة أو العلاقات؟", textEn: "How much does it interfere with your daily functioning?" },
    ],
    severityRules: [
      { maxScore: 7, band: "MINIMAL", labelAr: "لا يوجد أرق ملحوظ", labelEn: "No insomnia", interpretationAr: "نمط نومك سليم ومنتظم.", interpretationEn: "Normal healthy sleep architecture.", tone: "emerald" },
      { maxScore: 14, band: "MILD", labelAr: "أرق تحت سريري (خفيف)", labelEn: "Subthreshold", interpretationAr: "صعوبات نوم عارضة. ننصح ببروتوكولات نظافة النوم (Sleep Hygiene).", interpretationEn: "Mild sleep disturbance.", tone: "teal" },
      { maxScore: 21, band: "MODERATE", labelAr: "أرق سريري متوسط", labelEn: "Moderate clinical", interpretationAr: "ينصح ببرنامج العلاج السلوكي المعرفي للأرق (CBT-I).", interpretationEn: "Moderate clinical insomnia. CBT-I is indicated.", tone: "amber" },
      { maxScore: 28, band: "SEVERE", labelAr: "أرق سريري حاد", labelEn: "Severe clinical", interpretationAr: "أرق حاد يؤثر بشدة على صحتك. ينصح باستشارة طبيب نفسي فوراً.", interpretationEn: "Severe insomnia requiring comprehensive evaluation.", tone: "red" },
    ],
  },

  PCL5: {
    id: "PCL5",
    version: 1,
    category: "TRAUMA",
    titleAr: "مقياس اضطراب ما بعد الصدمة (PCL-5)",
    titleEn: "PCL-5 Post-Traumatic Stress Checklist",
    descriptionAr: "مقياس الفحص الإكلينيكي المعتمد (DSM-5) لتقييم الأعراض الناتجة عن التجارب الصادمة والضغوط النفسية الحادة.",
    descriptionEn: "The 20-item gold standard DSM-5 checklist for PTSD symptom clusters and trauma screening.",
    timeframeAr: "خلال الشهر الماضي",
    timeframeEn: "In the past month",
    options: FIVE_POINT_DISTRESS,
    questions: [
      // Cluster B: Intrusion (items 1-5)
      { id: "pcl1", textAr: "ذكريات متكررة ومزعجة ولا إرادية عن التجربة الصادمة؟", textEn: "Repeated, disturbing, and unwanted memories of the stressful experience?" },
      { id: "pcl2", textAr: "أحلام وكوابيس متكررة ومزعجة مرتبطة بالحادث؟", textEn: "Repeated, disturbing dreams of the stressful experience?" },
      { id: "pcl3", textAr: "الشعور أو التصرف المفاجئ وكأن التجربة الصادمة تحدث مجدداً (Flashbacks)؟", textEn: "Suddenly feeling or acting as if the stressful experience were actually happening again?" },
      { id: "pcl4", textAr: "الشعور بالضيق والانزعاج الشديد عند تذكر ما يخص الحادث؟", textEn: "Feeling very upset when something reminded you of the stressful experience?" },
      { id: "pcl5", textAr: "ردود فعل جسدية قوية (مثل تسارع ضربات القلب، صعوبة التنفس، التعرق) عند تذكر الحادث؟", textEn: "Strong physical reactions when something reminded you of the stressful experience?" },
      // Cluster C: Avoidance (items 6-7)
      { id: "pcl6", textAr: "تجنب الذكريات أو الأفكار أو المشاعر المرتبطة بالتجربة الصادمة؟", textEn: "Avoiding memories, thoughts, or feelings related to the stressful experience?" },
      { id: "pcl7", textAr: "تجنب المثيرات الخارجية (أشخاص، أماكن، محادثات، مواقف) التي تذكرك بالحادث؟", textEn: "Avoiding external reminders that arouse memories of the stressful experience?" },
      // Cluster D: Negative Alterations in Cognitions & Mood (items 8-14)
      { id: "pcl8", textAr: "صعوبة في تذكر أجزاء هامة من التجربة الصادمة؟", textEn: "Trouble remembering important parts of the stressful experience?" },
      { id: "pcl9", textAr: "معتقدات وتوقعات سلبية شديدة عن نفسك أو الآخرين أو العالم (مثل: أنا سيئ، لا يمكن الثقة بأحد)؟", textEn: "Strong negative beliefs about yourself, other people, or the world?" },
      { id: "pcl10", textAr: "إلقاء اللوم على نفسك أو الآخرين بطريقة غير واقعية حول ما حدث؟", textEn: "Blaming yourself or someone else for the stressful experience or what happened after?" },
      { id: "pcl11", textAr: "مشاعر سلبية مستمرة وقوية (مثل الخوف، الرعب، الغضب، الشعور بالذنب، الخزي)؟", textEn: "Having strong negative feelings such as fear, horror, anger, guilt, or shame?" },
      { id: "pcl12", textAr: "فقدان ملحوظ في الاهتمام بالأنشطة التي كنت تستمتع بها سابقاً؟", textEn: "Loss of interest in activities that you used to enjoy?" },
      { id: "pcl13", textAr: "الشعور بالانفصال أو الغربة والابتعاد عن الآخرين؟", textEn: "Feeling distant or cut off from other people?" },
      { id: "pcl14", textAr: "صعوبة بالغة في الشعور بالمشاعر الإيجابية (مثل العجز عن الشعور بالحب أو السعادة)؟", textEn: "Trouble experiencing positive feelings (for example, being unable to feel happiness or love)?" },
      // Cluster E: Alterations in Arousal & Reactivity (items 15-20)
      { id: "pcl15", textAr: "سلوك سريع الانفعال أو نوبات غضب حادة أو تصرفات عدوانية؟", textEn: "Irritable behavior, angry outbursts, or acting aggressively?" },
      { id: "pcl16", textAr: "الإقدام على مخاطر كبيرة أو تصرفات متهورة قد تضر بك؟", textEn: "Taking too many risks or doing things that could cause you harm?" },
      { id: "pcl17", textAr: "الشعور باليقظة المفرطة والتحفز المستمر والتوجس (Hypervigilance)؟", textEn: "Being 'superalert' or watchful or on guard?" },
      { id: "pcl18", textAr: "الشعور بالفزع والانتفاض السريع لأبسط الأصوات أو الحركات المفاجئة؟", textEn: "Feeling jumpy or easily startled?" },
      { id: "pcl19", textAr: "صعوبة في التركيز على المهام اليومية؟", textEn: "Having difficulty concentrating?" },
      { id: "pcl20", textAr: "صعوبة في الاستغراق في النوم أو البقاء نائماً؟", textEn: "Trouble falling or staying asleep?" },
    ],
    subscales: [
      { key: "clusterB", labelAr: "أعراض الاقتحام والذكريات المؤلمة (Cluster B)", labelEn: "Intrusion Symptoms", questionIds: ["pcl1", "pcl2", "pcl3", "pcl4", "pcl5"] },
      { key: "clusterC", labelAr: "أعراض التجنب (Cluster C)", labelEn: "Avoidance Symptoms", questionIds: ["pcl6", "pcl7"] },
      { key: "clusterD", labelAr: "التغيرات السلبية في الأفكار والمزاج (Cluster D)", labelEn: "Negative Cognition & Mood", questionIds: ["pcl8", "pcl9", "pcl10", "pcl11", "pcl12", "pcl13", "pcl14"] },
      { key: "clusterE", labelAr: "الاستثارة وفرط التحفز العصبي (Cluster E)", labelEn: "Arousal & Reactivity", questionIds: ["pcl15", "pcl16", "pcl17", "pcl18", "pcl19", "pcl20"] },
    ],
    severityRules: [
      { maxScore: 15, band: "MINIMAL", labelAr: "أعراض صدمة طفيفة", labelEn: "Minimal", interpretationAr: "لا تظهر مؤشرات صدمة تستوفي المعايير التشخيصية لاضطراب ما بعد الصدمة.", interpretationEn: "Symptoms are below clinical threshold for PTSD.", tone: "emerald" },
      { maxScore: 30, band: "MILD", labelAr: "تأثر تحت سريري بالصدمة", labelEn: "Mild", interpretationAr: "توجد بعض التأثيرات الضاغطة. ينصح بجلسات دعم نفسي لمعالجة الضغوط.", interpretationEn: "Mild traumatic stress distress.", tone: "teal" },
      { maxScore: 45, band: "MODERATE", labelAr: "احتمالية اضطراب ما بعد الصدمة (متوسط)", labelEn: "Moderate (PTSD Likely)", interpretationAr: "النتيجة تتجاوز الحد الإكلينيكي (33 نقطة). يوصى ببدء بروتوكول علاج الصدمات المتخصص (مثل EMDR أو CPT).", interpretationEn: "Score exceeds clinical cutoff of 33. Specialized trauma therapy (EMDR/CPT) recommended.", tone: "amber" },
      { maxScore: 80, band: "SEVERE", labelAr: "أعراض صدمة حادة ومستنزفة", labelEn: "Severe PTSD", interpretationAr: "مؤشرات صدمة حادة تستوجب تقييماً طبياً ونفسياً عاجلاً لوضع خطة علاجية متكاملة.", interpretationEn: "Severe PTSD symptoms requiring immediate comprehensive psychiatric and trauma intervention.", tone: "red" },
    ],
  },

  OCIR: {
    id: "OCIR",
    version: 1,
    category: "OCD",
    titleAr: "مقياس الوسواس القهري الإكلينيكي (OCI-R)",
    titleEn: "OCI-R Obsessive-Compulsive Inventory (Revised)",
    descriptionAr: "المقياس المعتمد دولياً لتقييم وجود وشدة أعراض الوساوس الفكرية والأفعال القهرية وأبعادها الستة.",
    descriptionEn: "Validated 18-item clinical instrument assessing 6 OCD symptom dimensions.",
    timeframeAr: "خلال الشهر الماضي",
    timeframeEn: "In the past month",
    options: FIVE_POINT_DISTRESS,
    questions: [
      // Washing (1, 7, 13)
      { id: "o1", textAr: "أشعر بعدم الارتياح والوسواس إذا لمست أشياء قد تكون ملوثة أو غير نظيفة؟", textEn: "I find it difficult to touch an object when I know it has been touched by strangers?" },
      { id: "o7", textAr: "أغسل يدي أكثر من اللازم وبشكل متكرر ومطول؟", textEn: "I wash and clean a great deal?" },
      { id: "o13", textAr: "أشعر أن ملابسي أو جسدي ملوثان بطريقة تزعجني بشدة؟", textEn: "I feel that my body or clothes are dirty/contaminated?" },
      // Obsessing (2, 8, 14)
      { id: "o2", textAr: "تراودني أفكار أو صور مزعجة تتكرر في ذهني رغماً عني ولا أستطيع طردها؟", textEn: "I have unwanted thoughts and find it difficult to get rid of them?" },
      { id: "o8", textAr: "أقضي وقتاً طويلاً في التفكير المتواصل في مواضيع غير سارة لا أريد التفكير بها؟", textEn: "I spend a lot of time pondering unpleasant thoughts?" },
      { id: "o14", textAr: "أشعر بالقلق الشديد من أن تصدر مني تصرفات مؤذية أو غير لائقة ضد إرادتي؟", textEn: "I am upset by unpleasant thoughts that come into my mind against my will?" },
      // Hoarding (3, 9, 15)
      { id: "o3", textAr: "أجد صعوبة بالغة في التخلص من الأشياء القديمة أو غير المفيدة وأحتفظ بها؟", textEn: "I avoid throwing things away because I am afraid I might need them later?" },
      { id: "o9", textAr: "أحتفظ بأشياء كثيرة لدرجة أنها تعيق الحركة أو تملأ المكان؟", textEn: "I have saved up so many things that they get in the way?" },
      { id: "o15", textAr: "أشعر بالانزعاج الشديد إذا حاول شخص التخلص من أشيائي القديمة؟", textEn: "I get very upset if someone discards my old possessions?" },
      // Ordering (4, 10, 16)
      { id: "o4", textAr: "أشعر بالضيق الشديد إذا لم تكن الأشياء مرتبة بنظام ودقة محددة؟", textEn: "I get upset if objects are not arranged properly?" },
      { id: "o10", textAr: "أعيد ترتيب الأغراض مراراً وتكراراً حتى تصبح مضبوطة تماماً؟", textEn: "I need things to be arranged in a particular order or symmetry?" },
      { id: "o16", textAr: "يلزمني أن تكون الأشياء متناسقة أو متوازنة بشكل صارم؟", textEn: "I feel things must be balanced or symmetrical?" },
      // Checking (5, 11, 17)
      { id: "o5", textAr: "أكرر فحص الأبواب أو النوافذ أو محابس الغاز أو المفاتيح الكهربائية عدة مرات للتأكد؟", textEn: "I check doors, windows, drawers, etc. more than once?" },
      { id: "o11", textAr: "أكرر قراءة الرسائل أو مراجعة الحسابات والأوراق خشية ارتكاب أخطاء؟", textEn: "I repeatedly check that I have not made a mistake?" },
      { id: "o17", textAr: "أشعر بضرورة إعادة التأكد من أمور قمت بها خشية حدوث مكروه؟", textEn: "I repeatedly check that I have not harmed anyone or caused damage?" },
      // Neutralizing / Mental Rituals (6, 12, 18)
      { id: "o6", textAr: "أشعر بأنني مضطر للعدّ أو تكرار كلمات وأرقام معينة في سري لتهدئة قلقي؟", textEn: "I feel compelled to count while I am doing things?" },
      { id: "o12", textAr: "أعتقد بوجود أرقام 'جيدة' وأرقام 'سيئة' تؤثر على ما أقوم به؟", textEn: "I feel that there are good and bad numbers?" },
      { id: "o18", textAr: "أقوم بطقوس ذهنية خاصة لإبطال فكرة سيئة راودتني؟", textEn: "I feel I have to repeat certain actions or thoughts to prevent disaster?" },
    ],
    subscales: [
      { key: "washing", labelAr: "وساوس النظافة والغسيل (Washing)", labelEn: "Washing & Contamination", questionIds: ["o1", "o7", "o13"] },
      { key: "obsessing", labelAr: "الأفكار والوساوس القهرية (Obsessing)", labelEn: "Obsessing", questionIds: ["o2", "o8", "o14"] },
      { key: "hoarding", labelAr: "الاكتناز والاحتفاظ بالأشياء (Hoarding)", labelEn: "Hoarding", questionIds: ["o3", "o9", "o15"] },
      { key: "ordering", labelAr: "الترتيب والتناظر الصارم (Ordering)", labelEn: "Ordering & Symmetry", questionIds: ["o4", "o10", "o16"] },
      { key: "checking", labelAr: "التفقد والتأكد المتكرر (Checking)", labelEn: "Checking", questionIds: ["o5", "o11", "o17"] },
      { key: "neutralizing", labelAr: "الطقوس الذهنية والتحييد (Neutralizing)", labelEn: "Neutralizing", questionIds: ["o6", "o12", "o18"] },
    ],
    severityRules: [
      { maxScore: 12, band: "MINIMAL", labelAr: "أعراض وسواسية طفيفة", labelEn: "Minimal", interpretationAr: "لا تظهر مؤشرات وسواس قهري تتجاوز العتبة الإكلينيكية.", interpretationEn: "Below clinical cutoff for OCD.", tone: "emerald" },
      { maxScore: 20, band: "MILD", labelAr: "احتمالية وسواس قهري خفيف", labelEn: "Mild", interpretationAr: "الدرجة تقترب من العتبة التشخيصية (21 نقطة). يوصى باستشارة أخصائي لتقييم الأعراض.", interpretationEn: "Approaching clinical cutoff (21). Clinical assessment recommended.", tone: "teal" },
      { maxScore: 35, band: "MODERATE", labelAr: "وسواس قهري متوسط", labelEn: "Moderate OCD", interpretationAr: "توصي البروتوكولات الطبية ببدء العلاج بالتعرض ومنع الاستجابة (ERP) المخصص للوسواس.", interpretationEn: "Moderate OCD. Exposure and Response Prevention (ERP) is the first-line treatment.", tone: "amber" },
      { maxScore: 72, band: "SEVERE", labelAr: "وسواس قهري حاد", labelEn: "Severe OCD", interpretationAr: "أعراض وسواسية وقهرية شديدة تستهلك وقتاً طويلاً. ينصح ببروتوكول علاجي دوائي وسلوكي مكثف.", interpretationEn: "Severe OCD symptoms requiring intensive combined medical and psychological care.", tone: "red" },
    ],
  },

  AUDIT: {
    id: "AUDIT",
    version: 1,
    category: "ADDICTION",
    titleAr: "مقياس فحص الكحوليات والاعتمادية (AUDIT)",
    titleEn: "AUDIT Alcohol Use Disorders Identification Test",
    descriptionAr: "مقياس الفحص المعتمد من منظمة الصحة العالمية (WHO) لتقييم درجات المخاطر المرتبطة بالاستهلاك والاعتمادية.",
    descriptionEn: "The 10-item WHO gold standard for screening unhealthy alcohol use.",
    timeframeAr: "خلال العام الماضي",
    timeframeEn: "In the past year",
    options: [
      { score: 0, labelAr: "أبداً", labelEn: "Never" },
      { score: 1, labelAr: "شهرياً أو أقل", labelEn: "Monthly or less" },
      { score: 2, labelAr: "2 إلى 4 مرات شهرياً", labelEn: "2 to 4 times a month" },
      { score: 3, labelAr: "2 إلى 3 مرات أسبوعياً", labelEn: "2 to 3 times a week" },
      { score: 4, labelAr: "4 مرات أو أكثر أسبوعياً", labelEn: "4 or more times a week" },
    ],
    questions: [
      { id: "au1", textAr: "كم مرة تتناول مشروبات تحتوي على الكحول؟", textEn: "How often do you have a drink containing alcohol?" },
      { id: "au2", textAr: "كم عدد الكؤوس أو الجرعات التي تتناولها في اليوم المعتاد للشرب؟", textEn: "How many drinks containing alcohol do you have on a typical day when you are drinking?" },
      { id: "au3", textAr: "كم مرة تتناول 6 جرعات أو أكثر في جلسة واحدة؟", textEn: "How often do you have six or more drinks on one occasion?" },
      { id: "au4", textAr: "كم مرة خلال العام الماضي وجدت أنك غير قادر على التوقف عن الشرب بمجرد أن بدأت؟", textEn: "How often during the last year have you found that you were not able to stop drinking once you had started?" },
      { id: "au5", textAr: "كم مرة خلال العام الماضي عجزت عن أداء مهامك المعتادة بسبب الشرب؟", textEn: "How often during the last year have you failed to do what was normally expected from you because of drinking?" },
      { id: "au6", textAr: "كم مرة احتجت للشرب في الصباح الباكر لتهدئة أعصابك أو بدء يومك؟", textEn: "How often during the last year have you needed a first drink in the morning to get yourself going?" },
      { id: "au7", textAr: "كم مرة شعرت بالذنب أو الندم بعد الشرب؟", textEn: "How often during the last year have you had a feeling of guilt or remorse after drinking?" },
      { id: "au8", textAr: "كم مرة عجزت عن تذكر ما حدث في الليلة السابقة بسبب الشرب؟", textEn: "How often during the last year have you been unable to remember what happened the night before?" },
      {
        id: "au9",
        textAr: "هل تعرضت أنت أو أي شخص آخر للإصابة أو الأذى نتيجة تناولك للكحول؟",
        textEn: "Have you or someone else been injured because of your drinking?",
        options: [
          { score: 0, labelAr: "لا", labelEn: "No" },
          { score: 2, labelAr: "نعم، ولكن ليس في العام الماضي", labelEn: "Yes, but not in the last year" },
          { score: 4, labelAr: "نعم، خلال العام الماضي", labelEn: "Yes, during the last year" },
        ],
      },
      {
        id: "au10",
        textAr: "هل أبدى أحد الأقارب أو الأصدقاء أو الأطباء قلقاً بشأن تناولك للكحول أو اقترح أن تتوقف؟",
        textEn: "Has a relative, friend, doctor, or other health care worker been concerned about your drinking?",
        options: [
          { score: 0, labelAr: "لا", labelEn: "No" },
          { score: 2, labelAr: "نعم، ولكن ليس في العام الماضي", labelEn: "Yes, but not in the last year" },
          { score: 4, labelAr: "نعم، خلال العام الماضي", labelEn: "Yes, during the last year" },
        ],
      },
    ],
    severityRules: [
      { maxScore: 7, band: "MINIMAL", labelAr: "منخفض الخطورة", labelEn: "Low risk", interpretationAr: "الاستهلاك ضمن النطاق المنخفض الخطورة.", interpretationEn: "Low risk consumption.", tone: "emerald" },
      { maxScore: 15, band: "MILD", labelAr: "استهلاك ينطوي على مخاطر", labelEn: "Hazardous", interpretationAr: "مؤشرات على استهلاك يهدد الصحة. ينصح بالاستشارة التوعوية وخطة تقليل المخاطر.", interpretationEn: "Hazardous drinking. Brief counseling and moderation advised.", tone: "teal" },
      { maxScore: 19, band: "MODERATE", labelAr: "استهلاك ضار بصحة الفرد", labelEn: "Harmful", interpretationAr: "مؤشرات على استهلاك ضار يؤثر على الأعضاء الحيوية والنفسية. ينصح ببدء علاج متخصص.", interpretationEn: "Harmful drinking pattern requiring structured clinical support.", tone: "amber" },
      { maxScore: 40, band: "SEVERE", labelAr: "احتمالية اعتمادية عالية (إدمان)", labelEn: "High Dependence", interpretationAr: "مؤشرات اعتمادية إكلينيكية تستوجب تقييماً طبياً لبرنامج سحب السموم وإعادة التأهيل.", interpretationEn: "High likelihood of alcohol dependence. Comprehensive medical detox and addiction care needed.", tone: "red" },
    ],
  },

  DAST10: {
    id: "DAST10",
    version: 1,
    category: "ADDICTION",
    titleAr: "مقياس فحص الاعتماد على المواد المخدرة (DAST-10)",
    titleEn: "DAST-10 Drug Abuse Screening Test",
    descriptionAr: "مقياس الفحص الإكلينيكي المعتمد لتقييم عواقب ومخاطر استخدام العقاقير والمواد المؤثرة على العقل.",
    descriptionEn: "10-item clinical screener assessing consequences of drug and substance abuse.",
    timeframeAr: "خلال الـ 12 شهراً الماضية",
    timeframeEn: "In the past 12 months",
    options: BINARY_YES_NO,
    questions: [
      { id: "d1", textAr: "هل استخدمت عقاقير أو مواد مؤثرة لغير الأغراض الطبية المصرحة؟", textEn: "Have you used drugs other than those required for medical reasons?" },
      { id: "d2", textAr: "هل تسيء استخدام أكثر من نوع واحد من الأدوية أو المواد في نفس الوقت؟", textEn: "Do you abuse more than one drug at a time?" },
      { id: "d3", textAr: "هل تجد صعوبة بالغة في التوقف عن تعاطي المواد عند رغبتك في ذلك؟", textEn: "Are you unable to stop abusing drugs when you want to?" },
      { id: "d4", textAr: "هل عانيت من نوبات إغماء أو فقدان ذاكرة مفاجئ نتيجة التعاطي؟", textEn: "Have you had blackouts or flashbacks as a result of drug use?" },
      { id: "d5", textAr: "هل تشعر بالسوء أو الذنب أو تأنيب الضمير بسبب التعاطي؟", textEn: "Do you ever feel bad or guilty about your drug use?" },
      { id: "d6", textAr: "هل يشكو أفراد أسرتك أو شريك حياتك من استخدامك للمواد؟", textEn: "Does your spouse (or parents) ever complain about your involvement with drugs?" },
      { id: "d7", textAr: "هل أهملت أسرتك أو مسؤولياتك بسبب تعاطي المواد؟", textEn: "Have you neglected your family because of your use of drugs?" },
      { id: "d8", textAr: "هل شاركت في أنشطة غير قانونية أو تصرفات خطرة للحصول على المواد؟", textEn: "Have you engaged in illegal activities in order to obtain drugs?" },
      { id: "d9", textAr: "هل عانيت من أعراض انسحاب جسدية أو نفسية مؤلمة عند التوقف؟", textEn: "Have you experienced withdrawal symptoms when you stopped taking drugs?" },
      { id: "d10", textAr: "هل عانيت من مشكلات صحية أو طبية (مثل فقدان الذاكرة أو التهابات) بسبب التعاطي؟", textEn: "Have you had medical problems as a result of your drug use?" },
    ],
    severityRules: [
      { maxScore: 0, band: "MINIMAL", labelAr: "لا توجد مشاكل معلنة", labelEn: "No problems", interpretationAr: "لا تظهر مؤشرات تعاطي مواد غير طبية.", interpretationEn: "No reported substance abuse problems.", tone: "emerald" },
      { maxScore: 2, band: "MILD", labelAr: "مستوى منخفض الخطورة", labelEn: "Low level", interpretationAr: "مخاطر منخفضة. ينصح بالتوعية والمراقبة الذاتية.", interpretationEn: "Low level of substance use problems. Monitoring advised.", tone: "teal" },
      { maxScore: 5, band: "MODERATE", labelAr: "مستوى متوسط من المشكلات", labelEn: "Moderate level", interpretationAr: "مؤشرات استهلاك ضار تؤثر على الحياة. ينصح باستشارة علاج الإدمان بالمركز.", interpretationEn: "Moderate substance problems. Clinical intervention recommended.", tone: "amber" },
      { maxScore: 10, band: "SEVERE", labelAr: "مستوى حاد / إدمان شديد", labelEn: "Severe level", interpretationAr: "مؤشرات إدمان حاد تتطلب برنامجاً علاجياً شاملاً تحت إشراف طبي متكامل.", interpretationEn: "Substantial to severe substance dependence requiring intensive therapy.", tone: "red" },
    ],
  },

  ASRS: {
    id: "ASRS",
    version: 1,
    category: "ADHD",
    titleAr: "مقياس فحص تشتت الانتباه وفرط الحركة للبالغين (ASRS v1.1)",
    titleEn: "ASRS v1.1 Adult ADHD Self-Report Scale",
    descriptionAr: "مقياس الفحص الإكلينيكي المعتمد من منظمة الصحة العالمية (WHO) لفرط الحركة وتشتت الانتباه لدى الكبار.",
    descriptionEn: "WHO 6-item validated screener for Adult Attention-Deficit/Hyperactivity Disorder.",
    timeframeAr: "خلال الـ 6 أشهر الماضية",
    timeframeEn: "In the past 6 months",
    options: [
      { score: 0, labelAr: "أبداً", labelEn: "Never" },
      { score: 1, labelAr: "نادراً", labelEn: "Rarely" },
      { score: 2, labelAr: "أحياناً", labelEn: "Sometimes" },
      { score: 3, labelAr: "غالباً", labelEn: "Often" },
      { score: 4, labelAr: "دائماً تقريباً", labelEn: "Very often" },
    ],
    questions: [
      { id: "as1", textAr: "كم مرة تواجه صعوبة في إنهاء التفاصيل الأخيرة من مشروع أو مهمة بعد إنجاز الأجزاء الصعبة؟", textEn: "Trouble wrapping up final details of a project once the challenging parts are done?" },
      { id: "as2", textAr: "كم مرة تجد صعوبة في تنظيم الأشياء والمهام التي تتطلب ترتيباً وتسلسلاً؟", textEn: "Trouble getting things in order when you have to do a task requiring organization?" },
      { id: "as3", textAr: "كم مرة تواجه صعوبة في تذكر المواعيد أو الالتزامات اليومية؟", textEn: "Problems remembering appointments or obligations?" },
      { id: "as4", textAr: "عندما تكون لديك مهمة تتطلب الكثير من التفكير والجهد الذهني، كم مرة تتجنبها أو تؤجل البدء فيها؟", textEn: "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?" },
      { id: "as5", textAr: "كم مرة تتململ أو تحرك يديك أو قدميك أثناء الجلوس لفترات طويلة؟", textEn: "Fidget or squirm with your hands or feet when you have to sit down for a long time?" },
      { id: "as6", textAr: "كم مرة تشعر بنشاط مفرط وكأنك مدفوع بمحرك، وتجد صعوبة في التباطؤ؟", textEn: "Feel overly active and compelled to do things, as if driven by a motor?" },
    ],
    severityRules: [
      { maxScore: 8, band: "MINIMAL", labelAr: "غير مرجح وجود تشتت انتباه", labelEn: "Unlikely ADHD", interpretationAr: "الأعراض ضمن النطاق المعتاد ولا تشير إلى اضطراب فرط الحركة وتشتت الانتباه.", interpretationEn: "Symptoms are not consistent with adult ADHD.", tone: "emerald" },
      { maxScore: 13, band: "MILD", labelAr: "مؤشرات خفيفة لتشتت الانتباه", labelEn: "Mild", interpretationAr: "توجد بعض الصعوبات في التنظيم وإدارة الوقت. تفيد تقنيات التخطيط والتنظيم الشخصي.", interpretationEn: "Mild attentional difficulties.", tone: "teal" },
      { maxScore: 17, band: "MODERATE", labelAr: "مؤشرات دالة بقوة على ADHD", labelEn: "Moderate (ADHD Likely)", interpretationAr: "النتيجة تشير إلى احتمال كبير لوجود اضطراب تشتت الانتباه وفرط الحركة. يوصى بتقييم إكلينيكي متخصص.", interpretationEn: "Strongly consistent with ADHD diagnosis in adults. Comprehensive clinical evaluation recommended.", tone: "amber" },
      { maxScore: 24, band: "SEVERE", labelAr: "أعراض تشتت وفرط حركة حادة", labelEn: "Severe ADHD", interpretationAr: "أعراض حادة تؤثر على الأداء المهني والأكاديمي والعلاقات. ينصح باستشارة طبية فورية.", interpretationEn: "Severe ADHD symptoms requiring diagnostic assessment and multimodal treatment.", tone: "red" },
    ],
  },
};

export function isAssessmentType(value: string): value is AssessmentType {
  return (ASSESSMENT_TYPES as readonly string[]).includes(value);
}

/** Highest possible raw total, derived dynamically per question option sets. */
export function maxScoreFor(scale: AssessmentScale): number {
  return scale.questions.reduce((sum, q) => {
    const opts = q.options ?? scale.options;
    const maxOpt = Math.max(...opts.map((o) => o.score));
    return sum + maxOpt;
  }, 0);
}

export interface SubscaleScore {
  key: string;
  labelAr: string;
  labelEn: string;
  score: number;
  maxScore: number;
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
  riskItemEndorsed: boolean;
  subscaleScores?: SubscaleScore[];
}

/**
 * Score a completed scale. Answers are keyed by question id; unanswered
 * questions count as zero, and out-of-range values are clamped to the question's
 * own option set rather than trusted (Tamper defense).
 */
export function scoreAssessment(
  scale: AssessmentScale,
  answers: Record<string, number>,
): ScoredAssessment {
  let totalScore = 0;
  let riskItemEndorsed = false;

  for (const question of scale.questions) {
    const opts = question.options ?? scale.options;
    const minScore = Math.min(...opts.map((o) => o.score));
    const maxScore = Math.max(...opts.map((o) => o.score));
    const raw = answers[question.id];
    const value =
      typeof raw === "number" && Number.isFinite(raw)
        ? Math.min(Math.max(raw, minScore), maxScore)
        : 0;
    totalScore += value;

    if (question.isRiskItem && value > 0) {
      riskItemEndorsed = true;
    }
  }

  // Check scale-level declarative risk rules
  if (scale.riskRules) {
    for (const rule of scale.riskRules) {
      for (const qid of rule.questionIds) {
        const val = answers[qid];
        if (typeof val === "number" && val >= rule.minScore) {
          riskItemEndorsed = true;
          break;
        }
      }
    }
  }

  // Compute optional subscales
  let subscaleScores: SubscaleScore[] | undefined;
  if (scale.subscales && scale.subscales.length > 0) {
    subscaleScores = scale.subscales.map((sub) => {
      let subTotal = 0;
      let subMax = 0;
      for (const qid of sub.questionIds) {
        const question = scale.questions.find((q) => q.id === qid);
        if (question) {
          const opts = question.options ?? scale.options;
          const minScore = Math.min(...opts.map((o) => o.score));
          const maxScore = Math.max(...opts.map((o) => o.score));
          const raw = answers[qid];
          const val =
            typeof raw === "number" && Number.isFinite(raw)
              ? Math.min(Math.max(raw, minScore), maxScore)
              : 0;
          subTotal += val;
          subMax += maxScore;
        }
      }
      return {
        key: sub.key,
        labelAr: sub.labelAr,
        labelEn: sub.labelEn,
        score: subTotal,
        maxScore: subMax,
      };
    });
  }

  // Rules are ordered by ascending maxScore; first match is the band.
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
    subscaleScores,
  };
}
