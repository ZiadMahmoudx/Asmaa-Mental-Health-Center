"use client";

import React, { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  HelpCircle,
  Loader2,
  PhoneCall,
  Printer,
  RotateCcw,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  submitAssessmentAction,
  saveAssessmentDraftAction,
  type AssessmentResultPayload,
} from "@/app/actions/assessments.actions";
import {
  type AssessmentScale,
  type ScaleOption,
  scoreAssessment,
} from "@/lib/content/assessment-scales";

interface Props {
  scale: AssessmentScale;
  initialDraftAnswers?: Record<string, number>;
  csrfToken: string;
  onReset?: () => void;
}

const ITEMS_PER_STEP = 4;

export function AssessmentStepper({
  scale,
  initialDraftAnswers = {},
  csrfToken,
  onReset,
}: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [answers, setAnswers] = useState<Record<string, number>>(initialDraftAnswers);
  const [currentStep, setCurrentStep] = useState(0); // 0..totalSteps-1 (last step is Review)
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [isSavingDraft, startDraftTransition] = useTransition();

  const [state, formAction, pending] = useActionState(submitAssessmentAction, null);

  // Group questions into chunks of ITEMS_PER_STEP
  const questionGroups = useMemo(() => {
    const groups: (typeof scale.questions)[] = [];
    for (let i = 0; i < scale.questions.length; i += ITEMS_PER_STEP) {
      groups.push(scale.questions.slice(i, i + ITEMS_PER_STEP));
    }
    return groups;
  }, [scale.questions]);

  const totalQuestionSteps = questionGroups.length;
  const isReviewStep = currentStep === totalQuestionSteps;
  const totalSteps = totalQuestionSteps + 1; // including review step

  // Live real-time score and risk detection
  const liveScored = useMemo(() => scoreAssessment(scale, answers), [scale, answers]);
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = scale.questions.length;
  const progressPercent = Math.min(100, Math.round((answeredCount / totalQuestions) * 100));

  // Current questions in view
  const currentQuestions = !isReviewStep ? questionGroups[currentStep] || [] : [];

  const handleSelectOption = (questionId: string, score: number) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: score };
      // Clear error for this question if it was flagged
      setStepErrors((errs) => errs.filter((id) => id !== questionId));
      return next;
    });
  };

  const validateCurrentStep = (): boolean => {
    if (isReviewStep) return true;
    const missing: string[] = [];
    for (const q of currentQuestions) {
      if (answers[q.id] === undefined) {
        missing.push(q.id);
      }
    }
    setStepErrors(missing);
    if (missing.length > 0) {
      // Scroll to the first missing element and set focus (F24)
      const el = document.getElementById(`question-card-${missing[0]}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const firstOptionBtn = el.querySelector<HTMLButtonElement>("button");
        if (firstOptionBtn) {
          setTimeout(() => firstOptionBtn.focus(), 150);
        }
      }
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    const nextStep = currentStep + 1;

    // Check if the current step contains a risk endorsement (F26)
    const currentStepHasRiskEndorsement = currentQuestions.some((q) => {
      const ans = answers[q.id];
      if (typeof ans !== "number") return false;
      if (q.isRiskItem && ans > 0) return true;
      if (scale.riskRules) {
        return scale.riskRules.some((r) => r.questionIds.includes(q.id) && ans >= r.minScore);
      }
      return false;
    });

    const fd = new FormData();
    fd.append("csrfToken", csrfToken);
    fd.append("type", scale.id);
    for (const [qid, val] of Object.entries(answers)) {
      fd.append(`answer_${qid}`, String(val));
    }

    if (currentStepHasRiskEndorsement) {
      // Blocking save with transient network retry (~400ms backoff) for risk disclosures (F27)
      try {
        const res = await saveAssessmentDraftAction(null, fd);
        if (!res.ok) {
          // Deterministic server rejection (rate-limit, session expiry, validation)
          console.warn("Safety draft escalation rejected by server:", res.messageEn);
        }
      } catch (err) {
        // Transient network error or 5xx connection drop: back off 400ms and retry once
        try {
          await new Promise((resolve) => setTimeout(resolve, 400));
          const retryRes = await saveAssessmentDraftAction(null, fd);
          if (!retryRes.ok) {
            console.warn("Safety draft escalation retry rejected:", retryRes.messageEn);
          }
        } catch (retryErr) {
          console.error("Safety draft write transient retry failed:", retryErr);
        }
      }
    } else {
      // Non-blocking background save for routine items
      startDraftTransition(async () => {
        try {
          const res = await saveAssessmentDraftAction(null, fd);
          if (!res.ok) {
            console.warn("Background draft save returned non-ok:", res.messageEn);
          }
        } catch (err) {
          console.error("Draft save failed:", err);
        }
      });
    }

    setCurrentStep(nextStep);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setStepErrors([]);
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  const handleJumpToQuestion = (questionId: string) => {
    const groupIndex = questionGroups.findIndex((grp) => grp.some((q) => q.id === questionId));
    if (groupIndex !== -1) {
      setCurrentStep(groupIndex);
      setStepErrors([]);
      setTimeout(() => {
        const el = document.getElementById(`question-card-${questionId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

  // Keyboard navigation listener: 0-4 for options
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReviewStep || state?.ok) return;
      // If user presses number 0, 1, 2, 3, 4 and there's exactly 1 unanswered question in current view
      if (["0", "1", "2", "3", "4"].includes(e.key)) {
        const num = parseInt(e.key, 10);
        const firstUnanswered = currentQuestions.find((q) => answers[q.id] === undefined);
        if (firstUnanswered) {
          const opts = firstUnanswered.options ?? scale.options;
          if (opts.some((o) => o.score === num)) {
            handleSelectOption(firstUnanswered.id, num);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestions, answers, isReviewStep, state?.ok, scale.options]);

  // Results View after successful submission
  if (state?.ok) {
    const result = state.data;
    const toneBg: Record<string, string> = {
      emerald: "bg-emerald-50 border-emerald-200 text-emerald-950",
      teal: "bg-teal-50 border-teal-200 text-teal-950",
      amber: "bg-amber-50 border-amber-200 text-amber-950",
      orange: "bg-orange-50 border-orange-200 text-orange-950",
      red: "bg-red-50 border-red-300 text-red-950",
    };
    const toneBadge: Record<string, string> = {
      emerald: "bg-emerald-600 text-white",
      teal: "bg-teal-700 text-white",
      amber: "bg-amber-600 text-white",
      orange: "bg-orange-600 text-white",
      red: "bg-red-700 text-white",
    };

    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 space-y-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="text-center space-y-3 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-800 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            {isAr ? "اكتمل التقييم السريري بنجاح" : "Clinical Assessment Completed"}
          </h2>
          <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
            {isAr ? scale.titleAr : scale.titleEn}
          </p>
        </div>

        {/* Severity Card */}
        <div
          className={`rounded-3xl border p-6 sm:p-8 space-y-5 ${
            toneBg[result.tone] ?? toneBg.teal
          }`}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                {isAr ? "مؤشر الفحص المبدئي (ليس تشخيصاً)" : "Initial Screening Indicator"}
              </span>
              <h3 className="text-xl sm:text-2xl font-black mt-0.5">
                {isAr ? result.labelAr : result.labelEn}
              </h3>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold opacity-75">
                {isAr ? "مجموع الدرجات" : "Total Score"}
              </span>
              <p className="text-3xl sm:text-4xl font-black font-mono">
                {result.totalScore}{" "}
                <span className="text-sm font-normal opacity-60">/ {result.maxScore}</span>
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm font-medium leading-relaxed">
            {isAr ? result.interpretationAr : result.interpretationEn}
          </p>

          {/* Subscale Breakdown if present */}
          {result.subscaleScores && result.subscaleScores.length > 0 && (
            <div className="pt-4 border-t border-slate-900/10 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider opacity-80">
                {isAr ? "توزيع أبعاد الأعراض (Subscales):" : "Symptom Dimension Breakdown:"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {result.subscaleScores.map((sub) => (
                  <div
                    key={sub.key}
                    className="p-3 rounded-2xl bg-white/70 border border-slate-900/10 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold">{isAr ? sub.labelAr : sub.labelEn}</span>
                    <span className="font-mono font-black tabular-nums">
                      {sub.score} / {sub.maxScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Crisis Escalation Banner if risk endorsed */}
        {result.riskItemEndorsed && (
          <div className="rounded-3xl bg-red-50 border border-red-300 p-6 space-y-3 text-red-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold">
                  {isAr ? "دعم نفسي فوري ومساندة على مدار الساعة" : "Immediate 24/7 Crisis Support"}
                </h4>
                <p className="text-xs text-red-800 mt-0.5">
                  {isAr
                    ? "سلامتك هي أولويتنا القصوى دائماً. فريق المركز متاح للمساندة وتتوفر خطوط الطوارئ المعتمدة مجاناً:"
                    : "Your safety is our utmost priority. Emergency support lines are available 24/7:"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="tel:16328"
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                <PhoneCall className="w-4 h-4" />
                {isAr ? "الخط الساخن للأمان النفسي (16328)" : "Crisis Hotline (16328)"}
              </a>
              <a
                href="tel:123"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                {isAr ? "الإسعاف المصري (123)" : "Ambulance (123)"}
              </a>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/patient"
              className="px-5 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition shadow-sm"
            >
              {isAr ? "العودة لحسابي ومتابعة التطور" : "Go to Patient Portal"}
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-3 rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {isAr ? "طباعة التقرير" : "Print Report"}
            </button>
          </div>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isAr ? "إجراء مقياس آخر" : "Take Another Scale"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Crisis Floating Banner if user answers a safety question positively */}
      {liveScored.riskItemEndorsed && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 flex items-center justify-between gap-4 text-red-950 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-xs font-bold">
              {isAr
                ? "إذا كنت تمر بلحظة صعبة وتفكر في إيذاء نفسك، يرجى التحدث فوراً مع أحد المختصين عبر الخط الساخن 16328 (متاح 24/7 مجاناً)."
                : "If you are having thoughts of self-harm, please reach out to the crisis hotline 16328 immediately."}
            </p>
          </div>
          <a
            href="tel:16328"
            className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-black shrink-0 hover:bg-red-700"
          >
            16328
          </a>
        </div>
      )}

      {/* Stepper Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Progress Bar & Step Header */}
        <div className="space-y-3 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>
              {isReviewStep
                ? isAr
                  ? "مراجعة الإجابات قبل الإرسال"
                  : "Review Answers Before Submit"
                : isAr
                ? `القسم ${currentStep + 1} من ${totalQuestionSteps}`
                : `Section ${currentStep + 1} of ${totalQuestionSteps}`}
            </span>
            <span className="font-mono tabular-nums">
              {isAr
                ? `تمت الإجابة على ${answeredCount} من ${totalQuestions} سؤال (${progressPercent}%)`
                : `${answeredCount} of ${totalQuestions} answered (${progressPercent}%)`}
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-700 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Error Notification (F24) */}
        {stepErrors.length > 0 && (
          <div
            id="step-validation-error"
            role="alert"
            aria-live="polite"
            className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {isAr
                ? `يرجى اختيار إجابة للأسئلة المحددة باللون الأصفر أدناه (${stepErrors.length} سؤال متبقٍ في هذا القسم)`
                : `Please answer the highlighted questions below (${stepErrors.length} remaining in this section)`}
            </span>
          </div>
        )}

        {state && !state.ok && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-800">
            {isAr ? state.messageAr : state.messageEn}
          </div>
        )}

        {/* Section View vs Review Step */}
        {!isReviewStep ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                {isAr ? scale.titleAr : scale.titleEn}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isAr ? scale.timeframeAr : scale.timeframeEn} —{" "}
                {isAr
                  ? "اختر الإجابة الأدق التي تعبر عن حالتك:"
                  : "Select the option that best describes your experience:"}
              </p>
            </div>

            <div className="space-y-5">
              {currentQuestions.map((question, idx) => {
                const isMissing = stepErrors.includes(question.id);
                const selectedScore = answers[question.id];
                const options = question.options ?? scale.options;
                const globalIndex = currentStep * ITEMS_PER_STEP + idx + 1;

                return (
                  <div
                    key={question.id}
                    id={`question-card-${question.id}`}
                    role="group"
                    aria-labelledby={`question-label-${question.id}`}
                    aria-invalid={isMissing ? "true" : undefined}
                    aria-describedby={isMissing ? "step-validation-error" : undefined}
                    className={`rounded-2xl border p-4 sm:p-5 transition space-y-3 ${
                      isMissing
                        ? "border-amber-400 bg-amber-50/40 ring-2 ring-amber-300/30"
                        : selectedScore !== undefined
                        ? "border-slate-200 bg-slate-50/50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-100 text-teal-800 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        {globalIndex}
                      </span>
                      <div className="space-y-0.5">
                        <p
                          id={`question-label-${question.id}`}
                          className="text-xs sm:text-sm font-bold text-slate-900 leading-snug"
                        >
                          {isAr ? question.textAr : question.textEn}
                        </p>
                        {question.hintAr && (
                          <p className="text-[11px] text-slate-500">
                            {isAr ? question.hintAr : question.hintEn}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                      {options.map((option) => {
                        const isSelected = selectedScore === option.score;
                        return (
                          <button
                            type="button"
                            key={option.score}
                            onClick={() => handleSelectOption(question.id, option.score)}
                            className={`p-3 rounded-xl border text-xs font-bold transition text-right flex items-center justify-between gap-2 ${
                              isSelected
                                ? "bg-teal-800 border-teal-900 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-700 hover:border-teal-600 hover:bg-slate-50"
                            }`}
                          >
                            <span>{isAr ? option.labelAr : option.labelEn}</span>
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isSelected ? "bg-teal-900 text-teal-200" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {option.score}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Review Step */
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                {isAr ? "مراجعة كامل إجاباتك قبل الاعتماد" : "Review All Answers"}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr
                  ? "تأكد من إجاباتك أدناه، يمكنك النقر على زر تعديل لتغيير إجابة أي سؤال:"
                  : "Review your selected responses below. You can click Edit to change any response:"}
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
              {scale.questions.map((question, idx) => {
                const score = answers[question.id];
                const options = question.options ?? scale.options;
                const opt = options.find((o) => o.score === score);

                return (
                  <div
                    key={question.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className="font-bold text-slate-900 truncate">
                        <span className="text-slate-400 ml-1.5 font-mono">{idx + 1}.</span>
                        {isAr ? question.textAr : question.textEn}
                      </p>
                      <p className="text-[11px] text-teal-800 font-bold">
                        {opt ? (isAr ? opt.labelAr : opt.labelEn) : isAr ? "غير محدد" : "Unset"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleJumpToQuestion(question.id)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition shrink-0 flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      {isAr ? "تعديل" : "Edit"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stepper Navigation Footer */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0 || pending}
            className="px-4 py-2.5 border border-slate-300 text-slate-700 disabled:opacity-30 rounded-xl text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {isAr ? "السابق" : "Previous"}
          </button>

          {!isReviewStep ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              {isAr ? "التالي" : "Next"}
              {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <form action={formAction}>
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="type" value={scale.id} />
              {Object.entries(answers).map(([qid, val]) => (
                <input key={qid} type="hidden" name={`answer_${qid}`} value={val} />
              ))}

              <button
                type="submit"
                disabled={pending || answeredCount < totalQuestions}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm"
              >
                {pending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isAr ? "جاري احتساب النتيجة..." : "Calculating..."}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {isAr ? "إرسال التقييم واعتماد النتيجة" : "Submit Assessment"}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
