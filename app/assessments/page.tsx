"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Brain,
  Moon,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  Calendar,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";

interface Question {
  id: string;
  textAr: string;
  textEn: string;
}

interface AssessmentDef {
  id: "PHQ9" | "GAD7" | "ASRS" | "ISI";
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: any;
  maxScore: number;
  options: Array<{ score: number; labelAr: string; labelEn: string }>;
  questions: Question[];
  calculateResult: (score: number) => {
    severityAr: string;
    severityEn: string;
    interpretationAr: string;
    interpretationEn: string;
    color: string;
  };
}

const assessments: AssessmentDef[] = [
  {
    id: "PHQ9",
    titleAr: "مقياس الاكتئاب السريري (PHQ-9)",
    titleEn: "PHQ-9 Depression Severity Scale",
    descriptionAr: "المقياس المعتمد دولياً لتقييم وجود وشدة الأعراض الاكتئابية خلال الأسبوعين الماضيين.",
    descriptionEn: "The validated clinical standard for assessing depression severity over the last 14 days.",
    icon: Activity,
    maxScore: 27,
    options: [
      { score: 0, labelAr: "أبداً (0 أيام)", labelEn: "Not at all" },
      { score: 1, labelAr: "عدة أيام (1-6 أيام)", labelEn: "Several days" },
      { score: 2, labelAr: "أكثر من نصف الأيام (7-11 يوماً)", labelEn: "More than half the days" },
      { score: 3, labelAr: "كل يوم تقريباً (12-14 يوماً)", labelEn: "Nearly every day" },
    ],
    questions: [
      { id: "p1", textAr: "قلة الاهتمام أو غياب المتعة في ممارسة الأنشطة المعتادة؟", textEn: "Little interest or pleasure in doing things?" },
      { id: "p2", textAr: "الشعور بالإحباط أو الحزن أو اليأس؟", textEn: "Feeling down, depressed, or hopeless?" },
      { id: "p3", textAr: "صعوبة في الاستغراق بالنوم، الاستيقاظ المتكرر، أو النوم المفرط؟", textEn: "Trouble falling or staying asleep, or sleeping too much?" },
      { id: "p4", textAr: "الشعور بالتعب أو انخفاض مستويات الطاقة بشكل مستمر؟", textEn: "Feeling tired or having little energy?" },
      { id: "p5", textAr: "ضعف الشهية للطعام أو الإفراط الشديد في تناول الأكل؟", textEn: "Poor appetite or overeating?" },
      { id: "p6", textAr: "الشعور بالسوء تجاه نفسك أو أنك شخص فاشل أو خذلت أسرتك؟", textEn: "Feeling bad about yourself — or that you are a failure?" },
      { id: "p7", textAr: "صعوبة في التركيز على القراءة أو مشاهدة التلفاز أو العمل؟", textEn: "Trouble concentrating on things such as reading or work?" },
      { id: "p8", textAr: "بطء شديد في الحركة أو الكلام، أو على العكس التململ وكثرة الحركة؟", textEn: "Moving or speaking slowly, or being unusually fidgety/restless?" },
      { id: "p9", textAr: "أفكار تفيد بأنك تفضل لو أنك مت أو تفكر بإيذاء نفسك؟", textEn: "Thoughts that you would be better off dead or hurting yourself?" },
    ],
    calculateResult: (score: number) => {
      if (score <= 4) return { severityAr: "طبيعي / طفيف جداً", severityEn: "Minimal", interpretationAr: "لا تظهر عليك مؤشرات اكتئابية ذات دلالة سريرية. حافظ على عاداتك الصحية.", interpretationEn: "No clinically significant depressive symptoms.", color: "emerald" };
      if (score <= 9) return { severityAr: "اكتئاب خفيف", severityEn: "Mild", interpretationAr: "أعراض اكتئابية خفيفة. قد تستفيد من جلسات الدعم النفسي وتنظيم نمط الحياة.", interpretationEn: "Mild depressive symptoms that may benefit from supportive therapy.", color: "teal" };
      if (score <= 14) return { severityAr: "اكتئاب متوسط", severityEn: "Moderate", interpretationAr: "توصي البروتوكولات الطبية بجلسات علاج معرفي سلوكي (CBT) منتظمة.", interpretationEn: "Moderate depression. Structured CBT is recommended.", color: "amber" };
      if (score <= 19) return { severityAr: "اكتئاب فوق المتوسط", severityEn: "Moderately Severe", interpretationAr: "توصي الجمعيات الطبية بخطة علاجية تجمع بين جلسات الـ CBT والاستشارة الدوائية.", interpretationEn: "Moderately severe depression. Combined pharmacotherapy and psychotherapy advised.", color: "orange" };
      return { severityAr: "اكتئاب حاد", severityEn: "Severe", interpretationAr: "أعراض اكتئابية شديدة تستلزم تدخلاً استشارياً عاجلاً ومتابعة طبية دقيقة.", interpretationEn: "Severe depression requiring immediate comprehensive psychiatric evaluation.", color: "red" };
    },
  },
  {
    id: "GAD7",
    titleAr: "مقياس القلق المعمم (GAD-7)",
    titleEn: "GAD-7 Generalized Anxiety Scale",
    descriptionAr: "مقياس الفحص الإكلينيكي الأكثر دقة لتشخيص القلق المعمم ونوبات التوتر.",
    descriptionEn: "Clinical screening tool for generalized anxiety and somatic worry.",
    icon: Sparkles,
    maxScore: 21,
    options: [
      { score: 0, labelAr: "أبداً", labelEn: "Not at all" },
      { score: 1, labelAr: "عدة أيام", labelEn: "Several days" },
      { score: 2, labelAr: "أكثر من نصف الأيام", labelEn: "More than half the days" },
      { score: 3, labelAr: "كل يوم تقريباً", labelEn: "Nearly every day" },
    ],
    questions: [
      { id: "g1", textAr: "الشعور بالعصبية أو التوتر أو أنك على الحافة؟", textEn: "Feeling nervous, anxious, or on edge?" },
      { id: "g2", textAr: "عدم القدرة على التوقف عن القلق أو السيطرة عليه؟", textEn: "Not being able to stop or control worrying?" },
      { id: "g3", textAr: "القلق المفرط بشأن أمور ومواقف متعددة ومختلفة؟", textEn: "Worrying too much about different things?" },
      { id: "g4", textAr: "صعوبة بالغة في الاسترخاء وتهدئة الأعصاب؟", textEn: "Trouble relaxing?" },
      { id: "g5", textAr: "الشعور بالتململ الشديد لدرجة صعوبة الجلوس في مكانك؟", textEn: "Being so restless that it is hard to sit still?" },
      { id: "g6", textAr: "سرعة الانفعال والغضب لأبسط الأسباب؟", textEn: "Becoming easily annoyed or irritable?" },
      { id: "g7", textAr: "الشعور بالخوف كأن شيئاً مروعاً وكارثياً على وشك الحدوث؟", textEn: "Feeling afraid as if something awful might happen?" },
    ],
    calculateResult: (score: number) => {
      if (score <= 4) return { severityAr: "قلق طبيعي / طفيف", severityEn: "Minimal", interpretationAr: "مستويات القلق لديك في النطاق الطبيعي الصحي.", interpretationEn: "Anxiety is within normal baseline.", color: "emerald" };
      if (score <= 9) return { severityAr: "قلق خفيف", severityEn: "Mild", interpretationAr: "توتر خفيف. تساعد تمارين التنفس واليقظة الذهنية على تفريغ الشحنات.", interpretationEn: "Mild anxiety. Relaxation techniques are effective.", color: "teal" };
      if (score <= 14) return { severityAr: "قلق متوسط", severityEn: "Moderate", interpretationAr: "قلق يؤثر على يومك. ينصح ببدء خطة علاج معرفي سلوكي مع أحد استشاريينا.", interpretationEn: "Moderate anxiety. CBT counseling recommended.", color: "amber" };
      return { severityAr: "قلق شديد", severityEn: "Severe", interpretationAr: "قلق مرتفع ومستمر يسبب استنزافاً كبيراً. ينصح باستشارة طبية عاجلة.", interpretationEn: "Severe anxiety requiring specialized psychiatric intervention.", color: "red" };
    },
  },
  {
    id: "ISI",
    titleAr: "مؤشر شدة الأرق وجودة النوم (ISI)",
    titleEn: "Insomnia Severity Index (ISI)",
    descriptionAr: "تقييم إكلينيكي لمعرفة درجة الأرق ومدى تأثيره على الوظائف النهارية والطاقة.",
    descriptionEn: "Clinical assessment of insomnia nature, severity, and daytime impairment.",
    icon: Moon,
    maxScore: 28,
    options: [
      { score: 0, labelAr: "لا يوجد (0)", labelEn: "None" },
      { score: 1, labelAr: "خفيف (1)", labelEn: "Mild" },
      { score: 2, labelAr: "متوسط (2)", labelEn: "Moderate" },
      { score: 3, labelAr: "شديد (3)", labelEn: "Severe" },
      { score: 4, labelAr: "شديد جداً (4)", labelEn: "Very severe" },
    ],
    questions: [
      { id: "i1", textAr: "صعوبة الاستغراق في النوم في بداية الليل؟", textEn: "Difficulty falling asleep?" },
      { id: "i2", textAr: "الاستيقاظ المتكرر أثناء النوم وصعوبة العودة للنوم؟", textEn: "Difficulty staying asleep?" },
      { id: "i3", textAr: "الاستيقاظ المبكر جداً قبل الوقت المرغوب؟", textEn: "Problems waking up too early?" },
      { id: "i4", textAr: "ما مدى رضاك عن جودة ونمط نومك الحالي؟", textEn: "How satisfied are you with your current sleep pattern?" },
      { id: "i5", textAr: "مدى ملاحظة الآخرين لتأثير قلة النوم على طاقتك ومزاجك؟", textEn: "How noticeable to others is your sleep problem in terms of impairing quality of life?" },
      { id: "i6", textAr: "مدى قلقك وانشغالك بمشكلة النوم الحالية؟", textEn: "How worried/distressed are you about your current sleep problem?" },
      { id: "i7", textAr: "مدى تأثير الأرق على أدائك اليومي بالعمل أو الدراسة؟", textEn: "To what extent do you consider your sleep problem to interfere with your daily functioning?" },
    ],
    calculateResult: (score: number) => {
      if (score <= 7) return { severityAr: "لا يوجد أرق ملحوظ", severityEn: "No Insomnia", interpretationAr: "نمط نومك سليم ومنتظم.", interpretationEn: "Normal healthy sleep architecture.", color: "emerald" };
      if (score <= 14) return { severityAr: "أرق تحت سريري (خفيف)", severityEn: "Subthreshold", interpretationAr: "صعوبات نوم عارضة. ننصح ببروتوكولات نظافة النوم (Sleep Hygiene).", interpretationEn: "Mild sleep disturbance.", color: "teal" };
      if (score <= 21) return { severityAr: "أرق سريري متوسط", severityEn: "Moderate Clinical", interpretationAr: "ينصح ببرنامج العلاج السلوكي المعرفي للأرق (CBT-I).", interpretationEn: "Moderate clinical insomnia. CBT-I is indicated.", color: "amber" };
      return { severityAr: "أرق سريري حاد", severityEn: "Severe Clinical", interpretationAr: "أرق حاد يؤثر بشدة على صحتك العصبية. ينصح باستشارة طبيب نفسي فوراً.", interpretationEn: "Severe insomnia requiring comprehensive medical and psychological evaluation.", color: "red" };
    },
  },
];

export default function AssessmentsPage() {
  const { language } = useLanguage();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<"PHQ9" | "GAD7" | "ASRS" | "ISI">("PHQ9");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);

  const activeAssessment = assessments.find((a) => a.id === selectedAssessmentId) || assessments[0];

  const handleSelectOption = (qId: string, score: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: score }));
  };

  const totalScore = activeAssessment.questions.reduce((acc, q) => acc + (answers[q.id] || 0), 0);
  const isComplete = activeAssessment.questions.every((q) => answers[q.id] !== undefined);
  const result = activeAssessment.calculateResult(totalScore);

  const handleReset = () => {
    setAnswers({});
    setShowResult(false);
  };

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-900 text-xs font-bold border border-teal-200">
            <Brain className="w-3.5 h-3.5 text-teal-700" />
            <span>{language === "ar" ? "الفحص الإكلينيكي الذاتي المعتمد" : "Validated Clinical Self-Assessments"}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-teal-950">
            {language === "ar" ? "بطارية الاختبارات والمقاييس النفسية" : "Psychiatric Diagnostic Battery"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            {language === "ar"
              ? "مقاييس معتمدة دولياً تستخدم في كبرى العيادات لتحديد مستوى القلق، الاكتئاب، واضطرابات النوم بدقة سريرية."
              : "Standardized psychometric scales to measure depression, anxiety, and sleep architecture."}
          </p>
        </div>

        {/* Assessment Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {assessments.map((a) => {
            const Icon = a.icon;
            const isSelected = selectedAssessmentId === a.id;
            return (
              <button
                key={a.id}
                onClick={() => {
                  setSelectedAssessmentId(a.id);
                  handleReset();
                }}
                className={`p-4 rounded-3xl border text-start rtl:text-right ltr:text-left transition-all ${
                  isSelected
                    ? "bg-teal-800 text-white border-teal-800 shadow-lg ring-2 ring-teal-800"
                    : "bg-white text-gray-800 border-alabaster-border hover:border-sage-400"
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`p-2 rounded-xl ${isSelected ? "bg-teal-700 text-white" : "bg-teal-50 text-teal-800"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-xs">{a.id}</span>
                </div>
                <h4 className="font-bold text-xs sm:text-sm leading-tight line-clamp-1">{language === "ar" ? a.titleAr : a.titleEn}</h4>
                <p className={`text-[11px] mt-1 line-clamp-2 ${isSelected ? "text-teal-200" : "text-gray-500"}`}>
                  {language === "ar" ? a.descriptionAr : a.descriptionEn}
                </p>
              </button>
            );
          })}
        </div>

        {/* Assessment Questionnaire or Results View */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-alabaster-border shadow-xl space-y-6">
          {!showResult ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-black text-lg text-teal-950">
                    {language === "ar" ? activeAssessment.titleAr : activeAssessment.titleEn}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {language === "ar" ? "أجب عن الأسئلة وفقاً لما شعرت به خلال الأسبوعين الماضيين:" : "Answer based on how you felt over the last 14 days:"}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="p-2 text-gray-400 hover:text-gray-700 transition"
                  title="إعادة التعيين"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {activeAssessment.questions.map((q, qIdx) => (
                  <div key={q.id} className="p-4 bg-alabaster-base rounded-2xl border border-alabaster-border space-y-3">
                    <p className="font-bold text-xs sm:text-sm text-gray-900">
                      <span className="text-teal-800 font-extrabold mr-1 ml-1">{qIdx + 1}.</span>
                      {language === "ar" ? q.textAr : q.textEn}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {activeAssessment.options.map((opt) => {
                        const isSelected = answers[q.id] === opt.score;
                        return (
                          <button
                            key={opt.score}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.score)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                              isSelected
                                ? "bg-teal-800 text-white border-teal-800 shadow-xs"
                                : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                            }`}
                          >
                            {language === "ar" ? opt.labelAr : opt.labelEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Calculate CTA */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {Object.keys(answers).length} من {activeAssessment.questions.length} أسئلة مكتملة
                </span>

                <button
                  type="button"
                  disabled={!isComplete}
                  onClick={() => setShowResult(true)}
                  className="px-8 py-3 bg-terracotta-600 hover:bg-terracotta-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-2xl shadow-md transition"
                >
                  {language === "ar" ? "عرض النتيجة والتقرير الإكلينيكي" : "Calculate Diagnostic Score"}
                </button>
              </div>
            </div>
          ) : (
            /* Result Screen */
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase">
                  {language === "ar" ? activeAssessment.titleAr : activeAssessment.titleEn}
                </span>
                <h3 className="text-3xl font-black text-teal-950">
                  {totalScore} / {activeAssessment.maxScore}
                </h3>
                <div className="inline-block px-4 py-1 rounded-full bg-teal-100 text-teal-900 font-extrabold text-sm">
                  {language === "ar" ? result.severityAr : result.severityEn}
                </div>
              </div>

              <div className="p-5 bg-alabaster-base rounded-3xl border border-alabaster-border text-xs sm:text-sm text-gray-700 leading-relaxed text-start rtl:text-right ltr:text-left space-y-3">
                <div className="font-bold text-teal-950 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-sage-700" />
                  <span>{language === "ar" ? "التفسير والتوجيه الإكلينيكي:" : "Clinical Interpretation:"}</span>
                </div>
                <p>{language === "ar" ? result.interpretationAr : result.interpretationEn}</p>
              </div>

              <div className="space-y-3 pt-2">
                <Link
                  href="/therapists"
                  className="block w-full py-3.5 bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-xs rounded-2xl shadow-lg transition"
                >
                  {language === "ar" ? "حجز استشارة متخصصة لمناقشة التقرير" : "Book Consultant to Discuss Report"}
                </Link>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs rounded-2xl transition"
                >
                  {language === "ar" ? "إعادة إجراء الفحص" : "Retake Assessment"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
