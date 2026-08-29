"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  History,
  Lock,
  Moon,
  Pill,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  type AssessmentHistoryRow,
} from "@/app/actions/assessments.actions";
import {
  ASSESSMENT_SCALES,
  ASSESSMENT_TYPES,
  type AssessmentType,
} from "@/lib/content/assessment-scales";
import { formatCairo } from "@/lib/whatsapp";
import { AssessmentStepper } from "./AssessmentStepper";

const SCALE_ICONS: Record<AssessmentType, typeof Activity> = {
  PHQ9: Activity,
  GAD7: Sparkles,
  ISI: Moon,
  PCL5: ShieldAlert,
  OCIR: RotateCcw,
  AUDIT: AlertTriangle,
  DAST10: Pill,
  ASRS: Zap,
};

const CATEGORY_LABELS = {
  ALL: { ar: "جميع المقاييس", en: "All Scales" },
  DEPRESSION: { ar: "الاكتئاب والمزاج", en: "Depression" },
  ANXIETY: { ar: "القلق والتوتر", en: "Anxiety" },
  SLEEP: { ar: "النوم والأرق", en: "Sleep" },
  TRAUMA: { ar: "الصدمات النفسية", en: "Trauma & PTSD" },
  OCD: { ar: "الوسواس القهري", en: "OCD" },
  ADDICTION: { ar: "الإدمان والمواد", en: "Addiction" },
  ADHD: { ar: "تشتت الانتباه (ADHD)", en: "ADHD" },
} as const;

const TONE_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  teal: "bg-teal-50 border-teal-200 text-teal-900",
  amber: "bg-amber-50 border-amber-200 text-amber-900",
  orange: "bg-orange-50 border-orange-200 text-orange-900",
  red: "bg-red-50 border-red-200 text-red-900",
};

interface Props {
  csrfToken: string;
  isAuthenticated: boolean;
  history: AssessmentHistoryRow[];
}

export function AssessmentRunner({ csrfToken, isAuthenticated, history }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [activeType, setActiveType] = useState<AssessmentType>("PHQ9");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const scale = ASSESSMENT_SCALES[activeType];

  const filteredScales = ASSESSMENT_TYPES.filter((type) => {
    if (categoryFilter === "ALL") return true;
    return ASSESSMENT_SCALES[type].category === categoryFilter;
  });

  return (
    <div className="space-y-8">
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {Object.entries(CATEGORY_LABELS).map(([catKey, labelObj]) => {
          const isActive = categoryFilter === catKey;
          return (
            <button
              key={catKey}
              type="button"
              onClick={() => setCategoryFilter(catKey)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 border ${
                isActive
                  ? "bg-teal-800 border-teal-900 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:border-teal-600 hover:bg-slate-50"
              }`}
            >
              {isAr ? labelObj.ar : labelObj.en}
            </button>
          );
        })}
      </div>

      {/* Scale Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filteredScales.map((type) => {
          const item = ASSESSMENT_SCALES[type];
          const Icon = SCALE_ICONS[type] ?? Activity;
          const active = activeType === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              aria-pressed={active}
              className={`p-4 rounded-3xl border text-start transition flex flex-col justify-between gap-3 ${
                active
                  ? "bg-teal-800 text-white border-teal-900 shadow-md ring-2 ring-teal-600/30"
                  : "bg-white text-slate-800 border-slate-200 hover:border-teal-600 hover:shadow-sm"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                      active ? "bg-teal-700/80 text-white" : "bg-teal-50 text-teal-800 border border-teal-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      active ? "bg-teal-900/60 text-teal-200" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.questions.length} {isAr ? "سؤال" : "items"}
                  </span>
                </div>

                <h3 className="text-xs font-black leading-snug">
                  {isAr ? item.titleAr : item.titleEn}
                </h3>
              </div>

              <p
                className={`text-[11px] line-clamp-2 leading-relaxed ${
                  active ? "text-teal-200" : "text-slate-500"
                }`}
              >
                {isAr ? item.descriptionAr : item.descriptionEn}
              </p>
            </button>
          );
        })}
      </div>

      {/* Authentication Notice if Guest */}
      {!isAuthenticated && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-900 font-medium">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              {isAr
                ? "يمكنك خوض التقييم والاطلاع على نتيجتك، ولحفظ النتيجة في سجلك الطبي يرجى تسجيل الدخول."
                : "You can take the scale and view results. To save to your medical record, please sign in."}
            </span>
          </div>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-xl bg-amber-800 text-white font-bold hover:bg-amber-900 shrink-0"
          >
            {isAr ? "تسجيل الدخول" : "Sign In"}
          </Link>
        </div>
      )}

      {/* Interactive Stepper Runner */}
      <AssessmentStepper
        key={activeType}
        scale={scale}
        csrfToken={csrfToken}
        onReset={() => setActiveType("PHQ9")}
      />

      {/* Patient Assessment History */}
      {history.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-teal-800" />
              {isAr ? "سجل نتائجك السابقة في المركز" : "Your Previous Screening History"}
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {history.length} {isAr ? "تقييم معتمد" : "records"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {history.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col justify-between gap-3 hover:border-slate-300 transition shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900">
                      {isAr ? row.titleAr : row.titleEn}
                    </span>
                    <span className="text-xs font-black font-mono text-teal-900 tabular-nums">
                      {row.totalScore}/{row.maxScore}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-mono">
                    {formatCairo(new Date(row.completedAtUTC), isAr ? "ar" : "en")}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                      TONE_CLASSES[row.tone] ?? TONE_CLASSES.teal
                    }`}
                  >
                    {isAr ? row.labelAr : row.labelEn}
                  </span>

                  {row.riskItemEndorsed && (
                    <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      {isAr ? "مؤشر أمان" : "Safety Flag"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}



