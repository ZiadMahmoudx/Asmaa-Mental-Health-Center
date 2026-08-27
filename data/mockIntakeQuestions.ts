export interface ConcernOption {
  id: string;
  labelAr: string;
  labelEn: string;
  category: string;
  iconName: string;
  matchedDoctorIds: string[];
}

export interface ScreeningOption {
  score: number;
  textAr: string;
  textEn: string;
  isCrisis?: boolean;
}

export interface ScreeningQuestion {
  id: string;
  textAr: string;
  textEn: string;
  options: ScreeningOption[];
}

export const mockConcerns: ConcernOption[] = [
  { id: "anxiety", labelAr: "القلق والتوتر الدائم", labelEn: "Chronic Anxiety & Tension", category: "mood", iconName: "Activity", matchedDoctorIds: ["doc-1", "doc-2"] },
  { id: "panic", labelAr: "نوبات الهلع المفاجئة", labelEn: "Sudden Panic Attacks", category: "panic", iconName: "Zap", matchedDoctorIds: ["doc-1", "doc-2"] },
  { id: "depression", labelAr: "الحزن وفقدان الشغف (الاكتئاب)", labelEn: "Depression & Loss of Joy", category: "mood", iconName: "CloudRain", matchedDoctorIds: ["doc-1", "doc-3"] },
  { id: "ocd", labelAr: "الأفكار والوساوس القهرية", labelEn: "Obsessive Thoughts (OCD)", category: "compulsion", iconName: "Repeat", matchedDoctorIds: ["doc-2"] },
  { id: "trauma", labelAr: "الصدمات النفسية والفقد", labelEn: "Trauma, PTSD & Grief", category: "trauma", iconName: "HeartCrack", matchedDoctorIds: ["doc-1", "doc-3"] },
  { id: "relationships", labelAr: "المشاكل الزوجية والعلاقات", labelEn: "Couples & Relationship Conflict", category: "family", iconName: "Users", matchedDoctorIds: ["doc-3"] },
  { id: "adhd", labelAr: "تشتت الانتباه وفرط الحركة (ADHD)", labelEn: "Adult ADHD & Focus Issues", category: "executive", iconName: "BrainCircuit", matchedDoctorIds: ["doc-4"] },
  { id: "sleep", labelAr: "الأرق وصعوبة النوم", labelEn: "Insomnia & Sleep Disruption", category: "sleep", iconName: "Moon", matchedDoctorIds: ["doc-2", "doc-1"] },
  { id: "addiction", labelAr: "الإدمان السلوكي والمواد", labelEn: "Substance & Behavioral Addiction", category: "addiction", iconName: "ShieldAlert", matchedDoctorIds: ["doc-4", "doc-1"] },
  { id: "burnout", labelAr: "الاحتراق النفسي وضغوط العمل", labelEn: "Workplace Burnout & Stress", category: "work", iconName: "Flame", matchedDoctorIds: ["doc-2", "doc-3"] }
];

export const mockScreeningQuestions: ScreeningQuestion[] = [
  {
    id: "q1",
    textAr: "خلال الأسبوعين الماضيين، كم مرة شعرت بقلة الاهتمام أو غياب المتعة في ممارسة أنشطتك المعتادة؟",
    textEn: "Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?",
    options: [
      { score: 0, textAr: "أبداً (0 أيام)", textEn: "Not at all", isCrisis: false },
      { score: 1, textAr: "عدة أيام (1-6 أيام)", textEn: "Several days", isCrisis: false },
      { score: 2, textAr: "أكثر من نصف الأيام (7-11 يوماً)", textEn: "More than half the days", isCrisis: false },
      { score: 3, textAr: "كل يوم تقريباً (12-14 يوماً)", textEn: "Nearly every day", isCrisis: false }
    ]
  },
  {
    id: "q2",
    textAr: "كم مرة شعرت بالتوتر، القلق الشديد، أو أنك على حافة الانهيار العصبي؟",
    textEn: "How often have you felt nervous, anxious, or on edge?",
    options: [
      { score: 0, textAr: "أبداً", textEn: "Not at all", isCrisis: false },
      { score: 1, textAr: "أيام قليلة", textEn: "Several days", isCrisis: false },
      { score: 2, textAr: "معظم الأيام", textEn: "More than half the days", isCrisis: false },
      { score: 3, textAr: "بشكل يومي ومستمر", textEn: "Nearly every day", isCrisis: false }
    ]
  },
  {
    id: "q3",
    textAr: "كيف تقيّم مدى تأثير هذه الصعوبات النفسية على قدرتك على العمل، الدراسة، أو إدارة علاقاتك الشخصية؟",
    textEn: "How difficult have these emotional problems made it for you to work, study, or handle relationships?",
    options: [
      { score: 0, textAr: "لا يوجد تأثير ملحوظ", textEn: "Not difficult at all", isCrisis: false },
      { score: 1, textAr: "تأثير خفيف يمكن التكيف معه", textEn: "Somewhat difficult", isCrisis: false },
      { score: 2, textAr: "تأثير ملحوظ يعطل بعض المهام", textEn: "Very difficult", isCrisis: false },
      { score: 3, textAr: "تأثير شديد يعيق الحياة اليومية تماماً", textEn: "Extremely difficult", isCrisis: false }
    ]
  },
  {
    id: "q4_crisis",
    textAr: "هل تراودك أفكار لإيذاء نفسك أو تشعر بأنك تفضل عدم الاستيقاظ غداً؟",
    textEn: "Have you had thoughts that you would be better off dead or of hurting yourself in any way?",
    options: [
      { score: 0, textAr: "لا على الإطلاق", textEn: "Never / Not at all", isCrisis: false },
      { score: 1, textAr: "أفكار عابرة جداً دون أي رغبة في التنفيذ", textEn: "Passing thought with no intent", isCrisis: false },
      { score: 3, textAr: "نعم، تراودني أفكار ملحة وأشعر بضيق شديد", textEn: "Yes, persistent distressing thoughts", isCrisis: true }
    ]
  }
];
