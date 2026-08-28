"use client";

import React, { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  History,
  Loader2,
  Lock,
  Moon,
  Phone,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  submitAssessmentAction,
  type AssessmentHistoryRow,
  type AssessmentResultPayload,
} from "@/app/actions/assessments.actions";
import type { ActionResult } from "@/lib/result";
import {
  ASSESSMENT_SCALES,
  ASSESSMENT_TYPES,
  scoreAssessment,
  type AssessmentType,
} from "@/lib/content/assessment-scales";
import { CSRF_FIELD } from "@/lib/constants";
import { formatCairo } from "@/lib/whatsapp";

/**
 * Screening-scale runner.
 *
 * The live total shown while answering is computed locally for responsiveness,
 * but it is only ever a preview: on submit the server rescores from the raw
 * answers and the result card renders the server's numbers. That is why the
 * component swaps to `result` state rather than promoting its own running
 * total — the two should agree, and if they ever disagree the server wins.
 *
 * A safety-flagged item (PHQ-9 item 9) surfaces crisis resources immediately,
 * regardless of how low the total is.
 */

const SCALE_ICONS: Record<AssessmentType, typeof Activity> = {
  PHQ9: Activity,
  GAD7: Sparkles,
  ISI: Moon,
};

const TONE_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  teal: "bg-teal-50 border-teal-200 text-teal-900",
  amber: "bg-amber-50 border-amber-200 text-amber-900",
  orange: "bg-orange-50 border-orange-200 text-orange-900",
  red: "bg-crisis-light border-crisis/30 text-crisis-dark",
};

interface Props {
  csrfToken: string;
  isAuthenticated: boolean;
  history: AssessmentHistoryRow[];
}

const initialState: ActionResult<AssessmentResultPayload> | null = null;

export function AssessmentRunner({ csrfToken, isAuthenticated, history }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  const [activeType, setActiveType] = useState<AssessmentType>("PHQ9");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [state, formAction, pending] = useActionState(submitAssessmentAction, initialState);

  const scale = ASSESSMENT_SCALES[activeType];

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  // Local preview only — the stored values come back from the server.
  const preview = useMemo(() => scoreAssessment(scale, answers), [scale, answers]);
  const answeredCount = scale.questions.filter((q) => answers[q.id] !== undefined).length;
  const isComplete = answeredCount === scale.questions.length;

  function switchScale(type: AssessmentType) {
    setActiveType(type);
    setAnswers({});
  }

  function reset() {
    setAnswers({});
  }

  const result = state?.ok ? state.data : null;

  return (
    <div className="space-y-6">
      {/* Scale picker */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ASSESSMENT_TYPES.map((type) => {
          const item = ASSESSMENT_SCALES[type];
          const Icon = SCALE_ICONS[type];
          const active = activeType === type && !result;

          return (
            <button
              key={type}
              type="button"
              onClick={() => switchScale(type)}
              aria-pressed={active}
              className={`p-4 rounded-2xl border text-start transition space-y-1.5 ${
                active
                  ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                  : "bg-white text-gray-700 border-alabaster-border hover:border-sage-400"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "text-sage-300" : "text-sage-700"}`} />
              <p className="text-xs font-extrabold leading-snug">
                {isAr ? item.titleAr : item.titleEn}
              </p>
              <p className={`text-[10px] ${active ? "text-teal-200" : "text-gray-500"}`}>
                {item.questions.length} {isAr ? "أسئلة" : "questions"}
              </p>
            </button>
          );
        })}
      </div>

      {result ? (
        <ResultCard
          result={result}
          isAr={isAr}
          onRetake={() => {
            setAnswers({});
            // Re-mounting via a scale switch clears the action state naturally.
            router.refresh();
          }}
        />
      ) : (
        <>
          {state && !state.ok && (
            <p
              role="alert"
              className="p-3.5 rounded-2xl bg-crisis-light border border-crisis/20 text-xs font-bold text-crisis-dark flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{isAr ? state.messageAr : state.messageEn}</span>
            </p>
          )}

          <form action={formAction} className="space-y-4">
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <input type="hidden" name="type" value={activeType} />

            <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-2">
              <h2 className="text-base font-black text-teal-950">
                {isAr ? scale.titleAr : scale.titleEn}
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                {isAr ? scale.descriptionAr : scale.descriptionEn}
              </p>
              <p className="text-[11px] text-gray-400 pt-1">
                {isAr
                  ? "خلال الأسبوعين الماضيين، كم مرة أزعجتك المشكلات التالية؟"
                  : "Over the last 2 weeks, how often have you been bothered by the following?"}
              </p>
            </div>

            <ol className="space-y-3">
              {scale.questions.map((question, index) => (
                <li
                  key={question.id}
                  className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-5 space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-alabaster-muted text-[11px] font-black text-teal-900 flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-xs font-bold text-gray-800 leading-relaxed">
                      {isAr ? question.textAr : question.textEn}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 ps-8.5">
                    {scale.options.map((option) => {
                      const selected = answers[question.id] === option.score;
                      return (
                        <label
                          key={option.score}
                          className={`py-2.5 px-2 rounded-xl border text-[11px] font-bold text-center cursor-pointer transition ${
                            selected
                              ? "bg-sage-600 text-white border-sage-600"
                              : "bg-alabaster-base text-gray-700 border-alabaster-border hover:border-sage-400"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`answer_${question.id}`}
                            value={option.score}
                            checked={selected}
                            onChange={() =>
                              setAnswers((prev) => ({ ...prev, [question.id]: option.score }))
                            }
                            className="sr-only"
                          />
                          {isAr ? option.labelAr : option.labelEn}
                        </label>
                      );
                    })}
                  </div>

                  {/* Immediate support the moment the safety item is endorsed —
                      not held back until the whole scale is submitted. */}
                  {question.isRiskItem &&
                    answers[question.id] !== undefined &&
                    answers[question.id]! > 0 && (
                      <div className="ms-8.5 p-3.5 rounded-2xl bg-crisis-light border border-crisis/30 space-y-2">
                        <p className="text-[11px] font-black text-crisis-dark flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {isAr ? "سلامتك أولاً" : "Your safety comes first"}
                        </p>
                        <p className="text-[11px] text-crisis-dark leading-relaxed">
                          {isAr
                            ? "إذا كنت تفكر في إيذاء نفسك، لا تبقَ بمفردك. تواصل فوراً مع الخط الساخن للصحة النفسية."
                            : "If you are thinking of harming yourself, please do not stay alone. Contact the mental health hotline now."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href="tel:16328"
                            className="px-3.5 py-2 rounded-xl bg-crisis hover:bg-crisis-dark text-white text-[11px] font-extrabold transition flex items-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {isAr ? "الخط الساخن 16328" : "Hotline 16328"}
                          </a>
                          <Link
                            href="/emergency"
                            className="px-3.5 py-2 rounded-xl bg-white border border-crisis/30 text-crisis-dark text-[11px] font-extrabold transition"
                          >
                            {isAr ? "صفحة الطوارئ وأدوات التهدئة" : "Emergency & calming tools"}
                          </Link>
                        </div>
                      </div>
                    )}
                </li>
              ))}
            </ol>

            {/* Sticky progress + submit */}
            <div className="sticky bottom-4 bg-white rounded-3xl border border-alabaster-border shadow-lg p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-600">
                  {answeredCount} {isAr ? "من" : "of"} {scale.questions.length}{" "}
                  {isAr ? "سؤال" : "answered"}
                </span>
                {isComplete && (
                  <span className="font-black text-teal-900 tabular-nums">
                    {isAr ? "النتيجة المبدئية:" : "Preview:"} {preview.totalScore} /{" "}
                    {preview.maxScore}
                  </span>
                )}
              </div>

              <div className="h-1.5 bg-alabaster-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage-600 transition-all"
                  style={{ width: `${(answeredCount / scale.questions.length) * 100}%` }}
                />
              </div>

              {isAuthenticated ? (
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!isComplete || pending}
                    className="flex-1 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold transition flex items-center justify-center gap-2"
                  >
                    {pending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {isAr ? "احسب النتيجة واحفظها" : "Score & save result"}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="px-4 py-3 rounded-2xl border border-alabaster-border hover:bg-alabaster-base text-xs font-extrabold text-gray-600 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login?next=%2Fassessments"
                  className="w-full py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold transition flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {isAr ? "سجّل الدخول لحفظ نتيجتك" : "Sign in to save your result"}
                </Link>
              )}
            </div>
          </form>
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-black text-teal-950 flex items-center gap-2">
            <History className="w-4 h-4 text-sage-700" />
            {isAr ? "نتائجك السابقة" : "Your previous results"}
          </h2>
          <ul className="space-y-2">
            {history.map((row) => (
              <li
                key={row.id}
                className="bg-white rounded-2xl border border-alabaster-border p-4 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-teal-950">
                    {isAr ? row.titleAr : row.titleEn}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {formatCairo(new Date(row.completedAtUTC))}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {row.riskItemEndorsed && (
                    <span className="px-2 py-0.5 rounded-lg bg-crisis-light text-crisis-dark border border-crisis/20 text-[10px] font-bold">
                      {isAr ? "مؤشر أمان" : "Safety flag"}
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${
                      TONE_CLASSES[row.tone] ?? TONE_CLASSES.teal
                    }`}
                  >
                    {isAr ? row.labelAr : row.labelEn}
                  </span>
                  <span className="text-sm font-black text-teal-900 tabular-nums">
                    {row.totalScore}/{row.maxScore}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ResultCard({
  result,
  isAr,
  onRetake,
}: {
  result: AssessmentResultPayload;
  isAr: boolean;
  onRetake: () => void;
}) {
  const percentage = Math.round((result.totalScore / result.maxScore) * 100);

  return (
    <div className="space-y-4">
      <div
        className={`rounded-3xl border p-7 text-center space-y-4 ${
          TONE_CLASSES[result.tone] ?? TONE_CLASSES.teal
        }`}
      >
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
          {isAr ? "نتيجتك" : "Your score"}
        </p>
        <p className="text-5xl font-black tabular-nums">
          {result.totalScore}
          <span className="text-2xl opacity-50"> / {result.maxScore}</span>
        </p>
        <div className="h-2 bg-white/50 rounded-full overflow-hidden max-w-xs mx-auto">
          <div className="h-full bg-current opacity-60" style={{ width: `${percentage}%` }} />
        </div>
        <p className="text-lg font-black">{isAr ? result.labelAr : result.labelEn}</p>
        <p className="text-xs leading-relaxed max-w-md mx-auto">
          {isAr ? result.interpretationAr : result.interpretationEn}
        </p>
      </div>

      {result.riskItemEndorsed && (
        <div className="rounded-3xl border border-crisis/30 bg-crisis-light p-6 space-y-3 text-center">
          <AlertTriangle className="w-8 h-8 text-crisis mx-auto" />
          <h3 className="text-sm font-black text-crisis-dark">
            {isAr ? "نحن قلقون عليك، ونريد مساعدتك الآن" : "We are concerned, and we want to help now"}
          </h3>
          <p className="text-xs text-crisis-dark leading-relaxed max-w-md mx-auto">
            {isAr
              ? "أشرت إلى وجود أفكار بإيذاء النفس. لا تبقَ بمفردك — تواصل مع الخط الساخن أو توجّه لأقرب مستشفى."
              : "You indicated thoughts of self-harm. Please do not stay alone — contact the hotline or go to the nearest hospital."}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <a
              href="tel:16328"
              className="px-5 py-2.5 rounded-2xl bg-crisis hover:bg-crisis-dark text-white text-xs font-extrabold transition flex items-center gap-1.5"
            >
              <Phone className="w-4 h-4" />
              {isAr ? "الخط الساخن 16328" : "Hotline 16328"}
            </a>
            <Link
              href="/emergency"
              className="px-5 py-2.5 rounded-2xl bg-white border border-crisis/30 text-crisis-dark text-xs font-extrabold transition"
            >
              {isAr ? "أدوات التهدئة الفورية" : "Immediate calming tools"}
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-alabaster-border p-5 space-y-3 text-center">
        <p className="text-[11px] text-gray-500 leading-relaxed">
          {isAr
            ? "هذا المقياس أداة فحص مبدئية وليس تشخيصاً طبياً. التشخيص يتم فقط عبر تقييم إكلينيكي مع استشاري."
            : "This is a screening aid, not a diagnosis. Only a clinical evaluation with a consultant can diagnose."}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link
            href="/therapists"
            className="px-5 py-2.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-extrabold transition"
          >
            {isAr ? "احجز جلسة مع استشاري" : "Book with a consultant"}
          </Link>
          <button
            type="button"
            onClick={onRetake}
            className="px-5 py-2.5 rounded-2xl border border-alabaster-border hover:bg-alabaster-base text-xs font-extrabold text-gray-700 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isAr ? "إجراء مقياس آخر" : "Take another scale"}
          </button>
        </div>
      </div>
    </div>
  );
}
