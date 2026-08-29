"use client";

import React, { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Circle,
  CloudRain,
  Flame,
  HeartCrack,
  Loader2,
  Lock,
  Moon,
  Phone,
  Repeat,
  ShieldAlert,
  Stethoscope,
  Users,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { submitIntakeAction, type IntakeResultPayload } from "@/app/actions/intake.actions";
import type { ActionResult } from "@/lib/result";
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  CONCERNS,
  GENDER_PREFERENCES,
  GENDER_PREFERENCE_LABELS,
  MEDICATION_HISTORY,
  MEDICATION_HISTORY_LABELS,
  SCREENING_QUESTIONS,
  THERAPY_HISTORY,
  THERAPY_HISTORY_LABELS,
  scoreIntake,
  type AgeGroup,
  type ConcernTag,
  type GenderPreference,
  type MedicationHistory,
  type TherapyHistory,
} from "@/lib/content/intake";
import { CSRF_FIELD } from "@/lib/constants";
import { formatEgp } from "@/lib/whatsapp";

/**
 * Clinical intake wizard.
 *
 * Four steps of questions, then a server-computed triage result with real
 * consultant matches. The previous version matched against hard-coded mock
 * doctor ids and stored nothing; this posts the raw answers and renders whatever
 * the server decides.
 *
 * Crisis handling is the part worth being careful about: the safety item is
 * detected locally the instant it is answered so the patient sees the hotline
 * immediately, and the server independently flags the same answer so the clinic
 * has a record to act on. Neither path depends on the other.
 */

interface Props {
  csrfToken: string;
  isAuthenticated: boolean;
  initialConcern?: ConcernTag | null;
}

const initialState: ActionResult<IntakeResultPayload> | null = null;
const TOTAL_STEPS = 4;

/**
 * Concern icons, mapped explicitly.
 *
 * Deliberately not `import * as Icons from "lucide-react"` with a dynamic
 * lookup: that defeats tree-shaking and pulled the entire icon set into this
 * route, taking it to 172 kB of JavaScript on a page patients open while
 * distressed. An explicit map ships only these ten.
 */
const CONCERN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  Zap,
  CloudRain,
  Repeat,
  HeartCrack,
  Users,
  BrainCircuit,
  Moon,
  ShieldAlert,
  Flame,
};

function ConcernIcon({ name, className }: { name: string; className?: string }) {
  const Component = CONCERN_ICONS[name] ?? Circle;
  return <Component className={className} />;
}

export function IntakeWizard({ csrfToken, isAuthenticated, initialConcern }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();
  const Next = isAr ? ArrowLeft : ArrowRight;
  const Back = isAr ? ArrowRight : ArrowLeft;

  const [step, setStep] = useState(1);
  const [concerns, setConcerns] = useState<ConcernTag[]>(() =>
    initialConcern ? [initialConcern] : [],
  );
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("25-34");
  const [therapyHistory, setTherapyHistory] = useState<TherapyHistory>("FIRST_TIME");
  const [medicationHistory, setMedicationHistory] = useState<MedicationHistory>("NONE");
  const [genderPreference, setGenderPreference] = useState<GenderPreference>("ANY");
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const [state, formAction, pending] = useActionState(submitIntakeAction, initialState);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  // Local preview so the crisis banner appears the moment the item is answered,
  // without waiting for a submit.
  const preview = useMemo(() => scoreIntake(answers), [answers]);

  const screeningComplete = SCREENING_QUESTIONS.every((q) => answers[q.id] !== undefined);
  const canAdvance =
    (step === 1 && concerns.length > 0) ||
    step === 2 ||
    step === 3 ||
    (step === 4 && screeningComplete);

  function toggleConcern(tag: ConcernTag) {
    setConcerns((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  }

  if (state?.ok) {
    return <IntakeResult result={state.data} isAr={isAr} />;
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-teal-950">
            {isAr ? `الخطوة ${step} من ${TOTAL_STEPS}` : `Step ${step} of ${TOTAL_STEPS}`}
          </span>
          <span className="text-gray-500 font-semibold">
            {step === 1 && (isAr ? "الشكوى الرئيسية" : "Chief concern")}
            {step === 2 && (isAr ? "السياق والتاريخ الطبي" : "Context & history")}
            {step === 3 && (isAr ? "تفضيلات الاستشاري" : "Consultant preference")}
            {step === 4 && (isAr ? "المقياس السريري" : "Clinical screening")}
          </span>
        </div>
        <div className="h-1.5 bg-alabaster-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-sage-600 transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {preview.crisisFlagged && <CrisisBanner isAr={isAr} />}

      {state && !state.ok && (
        <p
          role="alert"
          className="p-3.5 rounded-2xl bg-crisis-light border border-crisis/20 text-xs font-bold text-crisis-dark flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{isAr ? state.messageAr : state.messageEn}</span>
        </p>
      )}

      <form action={formAction} className="space-y-5">
        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
        {concerns.map((tag) => (
          <input key={tag} type="hidden" name="concerns" value={tag} />
        ))}
        <input type="hidden" name="ageGroup" value={ageGroup} />
        <input type="hidden" name="therapyHistory" value={therapyHistory} />
        <input type="hidden" name="medicationHistory" value={medicationHistory} />
        <input type="hidden" name="genderPreference" value={genderPreference} />
        {Object.entries(answers).map(([questionId, score]) => (
          <input key={questionId} type="hidden" name={`answer_${questionId}`} value={score} />
        ))}

        {/* Step 1 — concerns */}
        {step === 1 && (
          <section className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-teal-950">
                {isAr ? "ما الذي تود العمل عليه؟" : "What would you like to work on?"}
              </h2>
              <p className="text-[11px] text-gray-500">
                {isAr ? "يمكنك اختيار أكثر من إجابة." : "You can choose more than one."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CONCERNS.map((concern) => {
                const selected = concerns.includes(concern.tag);
                return (
                  <button
                    key={concern.tag}
                    type="button"
                    onClick={() => toggleConcern(concern.tag)}
                    aria-pressed={selected}
                    className={`p-4 rounded-2xl border text-start transition flex items-center gap-3 ${
                      selected
                        ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                        : "bg-white text-gray-700 border-alabaster-border hover:border-sage-400"
                    }`}
                  >
                    <ConcernIcon
                      name={concern.iconName}
                      className={`w-5 h-5 shrink-0 ${selected ? "text-sage-300" : "text-sage-700"}`}
                    />
                    <span className="text-xs font-bold leading-snug">
                      {isAr ? concern.labelAr : concern.labelEn}
                    </span>
                    {selected && <CheckCircle2 className="w-4 h-4 ms-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Step 2 — context */}
        {step === 2 && (
          <div className="space-y-4">
            <ChoiceGroup
              title={isAr ? "الفئة العمرية" : "Age group"}
              options={AGE_GROUPS.map((value) => ({
                value,
                label: isAr ? AGE_GROUP_LABELS[value].ar : AGE_GROUP_LABELS[value].en,
              }))}
              value={ageGroup}
              onChange={(value) => setAgeGroup(value as AgeGroup)}
            />
            <ChoiceGroup
              title={isAr ? "خبرتك السابقة مع العلاج النفسي" : "Previous therapy experience"}
              options={THERAPY_HISTORY.map((value) => ({
                value,
                label: isAr ? THERAPY_HISTORY_LABELS[value].ar : THERAPY_HISTORY_LABELS[value].en,
              }))}
              value={therapyHistory}
              onChange={(value) => setTherapyHistory(value as TherapyHistory)}
            />
            <ChoiceGroup
              title={isAr ? "الأدوية النفسية" : "Psychiatric medication"}
              options={MEDICATION_HISTORY.map((value) => ({
                value,
                label: isAr
                  ? MEDICATION_HISTORY_LABELS[value].ar
                  : MEDICATION_HISTORY_LABELS[value].en,
              }))}
              value={medicationHistory}
              onChange={(value) => setMedicationHistory(value as MedicationHistory)}
            />
          </div>
        )}

        {/* Step 3 — preference */}
        {step === 3 && (
          <ChoiceGroup
            title={isAr ? "هل تفضّل استشارياً بجنس معيّن؟" : "Do you prefer a consultant's gender?"}
            hint={
              isAr
                ? "نأخذ تفضيلك في الاعتبار عند الترشيح، لكنه لا يمنع ظهور استشاريين آخرين مناسبين لحالتك."
                : "We weigh your preference when matching, but it does not exclude other suitable consultants."
            }
            options={GENDER_PREFERENCES.map((value) => ({
              value,
              label: isAr
                ? GENDER_PREFERENCE_LABELS[value].ar
                : GENDER_PREFERENCE_LABELS[value].en,
            }))}
            value={genderPreference}
            onChange={(value) => setGenderPreference(value as GenderPreference)}
          />
        )}

        {/* Step 4 — screening */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-[11px] text-gray-500 px-1">
              {isAr
                ? "خلال الأسبوعين الماضيين، كم مرة أزعجتك المشكلات التالية؟"
                : "Over the last 2 weeks, how often have you been bothered by the following?"}
            </p>

            {SCREENING_QUESTIONS.map((question, index) => (
              <section
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ps-8.5">
                  {question.options.map((option) => {
                    const selected = answers[question.id] === option.score;
                    return (
                      <button
                        key={option.score}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [question.id]: option.score }))
                        }
                        aria-pressed={selected}
                        className={`py-2.5 px-3 rounded-xl border text-[11px] font-bold text-start transition ${
                          selected
                            ? option.isCrisis
                              ? "bg-crisis text-white border-crisis"
                              : "bg-sage-600 text-white border-sage-600"
                            : "bg-alabaster-base text-gray-700 border-alabaster-border hover:border-sage-400"
                        }`}
                      >
                        {isAr ? option.textAr : option.textEn}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1}
            className="px-5 py-3 rounded-2xl border border-alabaster-border hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-extrabold text-gray-600 transition flex items-center gap-1.5"
          >
            <Back className="w-3.5 h-3.5" />
            {isAr ? "السابق" : "Back"}
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep((current) => current + 1)}
              disabled={!canAdvance}
              className="px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold transition flex items-center gap-1.5"
            >
              {isAr ? "التالي" : "Next"}
              <Next className="w-3.5 h-3.5" />
            </button>
          ) : isAuthenticated ? (
            <button
              type="submit"
              disabled={!screeningComplete || pending}
              className="px-6 py-3 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold transition flex items-center gap-2"
            >
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Stethoscope className="w-4 h-4" />
              )}
              {isAr ? "عرض نتيجة التوجيه" : "See my matches"}
            </button>
          ) : (
            <Link
              href="/login?next=%2Fintake"
              className="px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold transition flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {isAr ? "سجّل الدخول لعرض النتيجة" : "Sign in to see results"}
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CrisisBanner({ isAr }: { isAr: boolean }) {
  return (
    <div
      role="alert"
      className="rounded-3xl border border-crisis/30 bg-crisis-light p-6 space-y-3"
    >
      <h2 className="text-sm font-black text-crisis-dark flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        {isAr ? "سلامتك أهم من إكمال الاستبيان" : "Your safety matters more than this form"}
      </h2>
      <p className="text-xs text-crisis-dark leading-relaxed">
        {isAr
          ? "أشرت إلى وجود أفكار بإيذاء النفس. لا تبقَ بمفردك — تواصل الآن مع الخط الساخن للأمانة العامة للصحة النفسية، وهو مجاني ومتاح 24 ساعة."
          : "You indicated thoughts of self-harm. Please do not stay alone — contact the national mental health hotline now. It is free and available 24/7."}
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href="tel:16328"
          className="px-5 py-2.5 rounded-2xl bg-crisis hover:bg-crisis-dark text-white text-xs font-extrabold transition flex items-center gap-1.5"
        >
          <Phone className="w-4 h-4" />
          {isAr ? "اتصل بـ 16328 الآن" : "Call 16328 now"}
        </a>
        <Link
          href="/emergency"
          className="px-5 py-2.5 rounded-2xl bg-white border border-crisis/30 text-crisis-dark text-xs font-extrabold transition"
        >
          {isAr ? "أدوات التهدئة الفورية" : "Immediate calming tools"}
        </Link>
      </div>
    </div>
  );
}

function ChoiceGroup({
  title,
  hint,
  options,
  value,
  onChange,
}: {
  title: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-3">
      <div>
        <h2 className="text-sm font-extrabold text-teal-950">{title}</h2>
        {hint && <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{hint}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              className={`py-3 px-4 rounded-2xl border text-xs font-bold text-start transition ${
                selected
                  ? "bg-teal-800 text-white border-teal-800"
                  : "bg-alabaster-base text-gray-700 border-alabaster-border hover:border-sage-400"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function IntakeResult({ result, isAr }: { result: IntakeResultPayload; isAr: boolean }) {
  const urgencyCopy = {
    CRISIS_EMERGENCY: {
      ar: "حالتك تحتاج تدخلاً عاجلاً",
      en: "Your situation needs urgent attention",
      tone: "bg-crisis-light border-crisis/30 text-crisis-dark",
    },
    EVALUATE: {
      ar: "ننصح بتقييم إكلينيكي قريب",
      en: "A clinical evaluation is recommended soon",
      tone: "bg-amber-50 border-amber-200 text-amber-900",
    },
    STABLE: {
      ar: "مؤشراتك في النطاق المستقر",
      en: "Your indicators are in the stable range",
      tone: "bg-emerald-50 border-emerald-200 text-emerald-800",
    },
  }[result.urgencyLevel];

  return (
    <div className="space-y-5">
      {result.crisisFlagged && <CrisisBanner isAr={isAr} />}

      <div className={`rounded-3xl border p-6 text-center space-y-2 ${urgencyCopy.tone}`}>
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
          {isAr ? "نتيجة الفرز المبدئي" : "Triage result"}
        </p>
        <p className="text-3xl font-black tabular-nums">
          {result.severityScore}
          <span className="text-lg opacity-50"> / {result.maxScore}</span>
        </p>
        <p className="text-sm font-black">{isAr ? urgencyCopy.ar : urgencyCopy.en}</p>
        <p className="text-[11px] leading-relaxed max-w-md mx-auto opacity-90">
          {isAr
            ? "هذا فرز مبدئي لتوجيهك للاستشاري الأنسب، وليس تشخيصاً طبياً."
            : "This is an initial triage to route you to the right consultant, not a diagnosis."}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-black text-teal-950">
          {isAr ? "الاستشاريون الأنسب لحالتك" : "Best-matched consultants"}
        </h2>

        {result.matches.map((match) => (
          <article
            key={match.id}
            className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm font-extrabold text-teal-950">{match.fullName}</h3>
              <p className="text-xs text-sage-800 font-semibold leading-snug">{match.title}</p>
              {match.matchedConcerns.length > 0 && (
                <p className="text-[11px] text-gray-500">
                  {isAr ? "يعالج: " : "Treats: "}
                  {match.matchedConcerns
                    .map((tag) => CONCERNS.find((c) => c.tag === tag))
                    .filter(Boolean)
                    .map((concern) => (isAr ? concern!.labelAr : concern!.labelEn))
                    .join("، ")}
                </p>
              )}
              <p className="text-[11px] text-gray-400">
                {match.yearsOfExperience} {isAr ? "سنة خبرة" : "years of experience"}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-end">
                <span className="block text-[10px] text-gray-400 font-bold">
                  {isAr ? "من" : "from"}
                </span>
                <span className="text-sm font-black text-teal-900">
                  {formatEgp(Math.min(match.priceOnlineEGP, match.priceOfflineEGP))}
                </span>
              </div>
              <Link
                href={`/booking/${match.id}`}
                className="px-5 py-2.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-extrabold transition"
              >
                {isAr ? "احجز" : "Book"}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <Link
        href="/therapists"
        className="block text-center text-xs font-bold text-teal-800 hover:text-teal-950"
      >
        {isAr ? "أو تصفّح جميع الاستشاريين" : "Or browse all consultants"}
      </Link>
    </div>
  );
}
