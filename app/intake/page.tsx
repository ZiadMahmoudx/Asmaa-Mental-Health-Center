"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Brain,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  User,
  Heart,
  ChevronRight,
  Zap,
  Activity,
  CloudRain,
  Repeat,
  HeartCrack,
  Users,
  BrainCircuit,
  Moon,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { mockConcerns, mockScreeningQuestions, ScreeningOption } from "@/data/mockIntakeQuestions";
import { TherapistGender, SessionType, TriageUrgency } from "@/types/telehealth";
import { formatCurrency } from "@/lib/utils";

function IntakeWizardContent() {
  const { language } = useLanguage();
  const { doctors, saveIntakeAssessment, currentUser } = useTelehealth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [sessionType, setSessionType] = useState<SessionType>("INDIVIDUAL");
  const [ageGroup, setAgeGroup] = useState<string>("25-34");
  const [therapyHistory, setTherapyHistory] = useState<string>("FIRST_TIME");
  const [medicationHistory, setMedicationHistory] = useState<string>("NONE");
  const [genderPref, setGenderPref] = useState<TherapistGender>("ANY");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [crisisDetected, setCrisisDetected] = useState(false);

  const ArrowNext = language === "ar" ? ArrowLeft : ArrowRight;
  const ArrowPrev = language === "ar" ? ArrowRight : ArrowLeft;

  // Pre-fill concern from URL query if present (e.g. ?concern=panic)
  useEffect(() => {
    const initialConcern = searchParams.get("concern");
    if (initialConcern && !selectedConcerns.includes(initialConcern)) {
      setSelectedConcerns([initialConcern]);
    }
  }, [searchParams]);

  const toggleConcern = (id: string) => {
    if (selectedConcerns.includes(id)) {
      setSelectedConcerns(selectedConcerns.filter((c) => c !== id));
    } else {
      setSelectedConcerns([...selectedConcerns, id]);
    }
  };

  const handleScreeningAnswer = (qId: string, score: number, isCrisis?: boolean) => {
    setAnswers((prev) => ({ ...prev, [qId]: score }));
    if (isCrisis) {
      setCrisisDetected(true);
    }
  };

  // Calculate total severity score
  const totalScore = Object.values(answers).reduce((acc, curr) => acc + curr, 0);

  // Calculate matched doctors
  const getMatchedDoctors = () => {
    return doctors.map((doc) => {
      let matchScore = 80;

      // Match by specialties
      selectedConcerns.forEach((concernId) => {
        const concernObj = mockConcerns.find((c) => c.id === concernId);
        if (concernObj && concernObj.matchedDoctorIds.includes(doc.id)) {
          matchScore += 10;
        }
      });

      // Match by gender preference
      if (genderPref !== "ANY") {
        if (doc.gender === genderPref) {
          matchScore += 8;
        } else {
          matchScore -= 15;
        }
      }

      // Bonus for high experience
      if (doc.yearsOfExperience >= 15) matchScore += 4;

      const clamped = Math.min(99, Math.max(75, matchScore));
      return {
        doctor: doc,
        matchPercentage: clamped,
      };
    }).sort((a, b) => b.matchPercentage - a.matchPercentage);
  };

  const handleCompleteIntake = () => {
    const matched = getMatchedDoctors().slice(0, 3).map((m) => m.doctor.id);
    const urgency: TriageUrgency = crisisDetected
      ? "CRISIS_EMERGENCY"
      : totalScore >= 7
      ? "EVALUATE"
      : "STABLE";

    saveIntakeAssessment({
      patientId: currentUser.id,
      patientName: currentUser.name,
      primaryConcerns: selectedConcerns,
      severityScore: totalScore,
      urgencyLevel: urgency,
      preferredTherapistGender: genderPref,
      sessionType,
      ageGroup,
      therapyHistory,
      medicationHistory,
      matchedDoctorIds: matched,
    });
  };

  const matchedResults = getMatchedDoctors();

  const getConcernIcon = (iconName: string) => {
    switch (iconName) {
      case "Zap": return Zap;
      case "Activity": return Activity;
      case "CloudRain": return CloudRain;
      case "Repeat": return Repeat;
      case "HeartCrack": return HeartCrack;
      case "Users": return Users;
      case "BrainCircuit": return BrainCircuit;
      case "Moon": return Moon;
      case "ShieldAlert": return ShieldAlert;
      case "Flame": return Flame;
      default: return Heart;
    }
  };

  return (
    <div className="min-h-[85vh] py-10 bg-alabaster-base">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Wizard Container Card */}
        <div className="bg-white rounded-3xl border border-alabaster-border shadow-xl p-6 sm:p-10 relative overflow-hidden">
          {/* Top Wizard Header & Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2">
              <span className="text-teal-900 font-extrabold">
                {language === "ar" ? `الخطوة ${step} من 5` : `Step ${step} of 5`}
              </span>
              <span className="text-sage-700">
                {step === 1 && (language === "ar" ? "تحديد الشكوى الرئيسية" : "Chief Concern")}
                {step === 2 && (language === "ar" ? "السياق والتاريخ الطبي" : "Patient Context")}
                {step === 3 && (language === "ar" ? "تفضيلات المعالج" : "Therapist Preferences")}
                {step === 4 && (language === "ar" ? "مقياس الأعراض السريري" : "Symptom Screening")}
                {step === 5 && (language === "ar" ? "نتائج التوجيه الإكلينيكي" : "Matching Results")}
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-800 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* STEP 1: Chief Concerns */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2 text-start rtl:text-right ltr:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-900 text-xs font-bold">
                  <Brain className="w-3.5 h-3.5 text-teal-700" />
                  <span>{language === "ar" ? "التقييم الأولي" : "Initial Assessment"}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-teal-950">
                  {language === "ar"
                    ? "ما هي الأمور أو المشاعر التي ترغب في معالجتها في جلساتك؟"
                    : "What primary concerns or emotions would you like to address?"}
                </h2>
                <p className="text-xs text-gray-500">
                  {language === "ar"
                    ? "يمكنك اختيار أكثر من عنصر لمساعدتنا في تحديد التخصص الدقيق."
                    : "You can select multiple options to help us refine the specialty match."}
                </p>
              </div>

              {/* Concern Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {mockConcerns.map((concern) => {
                  const isSelected = selectedConcerns.includes(concern.id);
                  const Icon = getConcernIcon(concern.iconName);
                  return (
                    <button
                      key={concern.id}
                      type="button"
                      onClick={() => toggleConcern(concern.id)}
                      className={`p-4 rounded-2xl border text-start rtl:text-right ltr:text-left flex items-center justify-between gap-3 transition-all duration-200 ${
                        isSelected
                          ? "bg-teal-50/90 border-teal-700 text-teal-950 shadow-sm ring-1 ring-teal-700"
                          : "bg-white border-gray-200 hover:border-sage-400 text-gray-700 hover:bg-alabaster-base"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${
                            isSelected ? "bg-teal-800 text-white" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold">
                          {language === "ar" ? concern.labelAr : concern.labelEn}
                        </span>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                          isSelected
                            ? "bg-teal-800 border-teal-800 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Patient Context & History */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2 text-start rtl:text-right ltr:text-left">
                <h2 className="text-xl sm:text-2xl font-black text-teal-950">
                  {language === "ar" ? "أخبرنا أكثر عن سياق الجلسة وتاريخك السابق" : "Tell us more about your clinical background"}
                </h2>
                <p className="text-xs text-gray-500">
                  {language === "ar"
                    ? "تساعدنا هذه المعلومات في تخصيص بروتوكول الجلسة ونوع الاستشارة."
                    : "This assists in calibrating session length and therapeutic modality."}
                </p>
              </div>

              <div className="space-y-5">
                {/* Session Type */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 block">
                    {language === "ar" ? "نوع الجلسة المطلوبة:" : "Session Modality:"}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "INDIVIDUAL", labelAr: "فردية للبالغين", labelEn: "Individual Adult" },
                      { id: "COUPLES", labelAr: "استشارة زوجية", labelEn: "Couples Therapy" },
                      { id: "CHILD", labelAr: "أطفال ومراهقين", labelEn: "Adolescent / Child" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSessionType(st.id as SessionType)}
                        className={`p-3 rounded-2xl border text-xs font-bold transition ${
                          sessionType === st.id
                            ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                        }`}
                      >
                        {language === "ar" ? st.labelAr : st.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age Group */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 block">
                    {language === "ar" ? "الفئة العمرية للمريض:" : "Age Group:"}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {["18-24", "25-34", "35-49", "50+"].map((age) => (
                      <button
                        key={age}
                        type="button"
                        onClick={() => setAgeGroup(age)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                          ageGroup === age
                            ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                        }`}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Previous Therapy Experience */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 block">
                    {language === "ar" ? "هل خضت جلسات علاج نفسي سابقة؟" : "Previous therapy experience?"}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "FIRST_TIME", labelAr: "هذه أول تجربة لي", labelEn: "First time ever" },
                      { id: "PREVIOUS_THERAPY", labelAr: "خضت جلسات علاجية في السابق", labelEn: "Had therapy before" },
                    ].map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => setTherapyHistory(exp.id)}
                        className={`p-3 rounded-2xl border text-xs font-bold transition ${
                          therapyHistory === exp.id
                            ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                        }`}
                      >
                        {language === "ar" ? exp.labelAr : exp.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Psychiatric Medication History */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 block">
                    {language === "ar" ? "هل تتناول أدوية نفسية حالياً؟" : "Currently taking psychiatric medication?"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "NONE", labelAr: "لا أتناول أدوية", labelEn: "No medications" },
                      { id: "CURRENT", labelAr: "نعم، أدوية مستمرة", labelEn: "Yes, active" },
                      { id: "PAST", labelAr: "تناولت بالماضي وتوقفت", labelEn: "Taken in past" },
                    ].map((med) => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => setMedicationHistory(med.id)}
                        className={`p-3 rounded-2xl border text-xs font-bold transition ${
                          medicationHistory === med.id
                            ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                        }`}
                      >
                        {language === "ar" ? med.labelAr : med.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Therapist Preferences */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2 text-start rtl:text-right ltr:text-left">
                <h2 className="text-xl sm:text-2xl font-black text-teal-950">
                  {language === "ar" ? "تفضيلاتك الشخصية للاستشاري المعالج" : "Your Therapist Preferences"}
                </h2>
                <p className="text-xs text-gray-500">
                  {language === "ar"
                    ? "راحتك النفسية هي الأساس، اختر ما يمنحك أعلى درجات الأمان في الجلسة."
                    : "Your comfort is paramount; select your preferred counselor attributes."}
                </p>
              </div>

              <div className="space-y-6">
                {/* Gender Preference */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 block">
                    {language === "ar" ? "هل تفضل طبيباً أم طبيبة؟" : "Preferred Therapist Gender:"}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "ANY", labelAr: "لا يوجد تفضيل محدد (الأنسب علمياً)", labelEn: "No preference (Best match)" },
                      { id: "FEMALE", labelAr: "طبيبة / أخصائية (أنثى)", labelEn: "Female Consultant" },
                      { id: "MALE", labelAr: "طبيب / أخصائي (ذكر)", labelEn: "Male Consultant" },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGenderPref(g.id as TherapistGender)}
                        className={`p-4 rounded-2xl border text-xs font-bold transition text-center ${
                          genderPref === g.id
                            ? "bg-teal-800 text-white border-teal-800 shadow-md"
                            : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                        }`}
                      >
                        {language === "ar" ? g.labelAr : g.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dialect / Language preference guarantee */}
                <div className="p-4 bg-sage-50 rounded-2xl border border-sage-200/80 text-xs text-sage-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-teal-900">
                    <ShieldCheck className="w-4 h-4 text-sage-700" />
                    <span>{language === "ar" ? "ضمان التوافق اللغوي والثقافي" : "Cultural & Dialect Alignment Guarantee"}</span>
                  </div>
                  <p className="leading-relaxed text-gray-600">
                    {language === "ar"
                      ? "جميع استشاريينا يتحدثون العربية الفصحى واللهجات العربية (المصرية، الخليجية، الشامية) بالإضافة للإنجليزية بطلاقة تامة لضمان فهم عميق لمشاعرك وسياقك الاجتماعي."
                      : "Our faculty is proficient in Arabic (Egyptian, Gulf, Levantine dialects) and English, ensuring nuanced empathy."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Symptom Screening (PHQ/GAD Style) */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2 text-start rtl:text-right ltr:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200">
                  <Activity className="w-3.5 h-3.5 text-amber-700" />
                  <span>{language === "ar" ? "مقياس الفحص الإكلينيكي المعتمد" : "Validated Clinical Screening"}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-teal-950">
                  {language === "ar" ? "تقييم شدة الأعراض خلال الأسبوعين الماضيين" : "Symptom Severity Screening (Last 14 Days)"}
                </h2>
                <p className="text-xs text-gray-500">
                  {language === "ar"
                    ? "إجاباتك سرية ومشفرة 100% وتستخدم فقط لمعايرة الخطة العلاجية."
                    : "Confidential assessment used solely for precision clinical calibration."}
                </p>
              </div>

              {/* Screening Questions List */}
              <div className="space-y-5">
                {mockScreeningQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 sm:p-5 bg-alabaster-base rounded-2xl border border-alabaster-border space-y-3"
                  >
                    <p className="font-bold text-xs sm:text-sm text-gray-900">
                      <span className="text-teal-800 font-extrabold mr-1 ml-1">{idx + 1}.</span>
                      {language === "ar" ? q.textAr : q.textEn}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = answers[q.id] === opt.score;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleScreeningAnswer(q.id, opt.score, opt.isCrisis)}
                            className={`p-3 rounded-xl border text-start rtl:text-right ltr:text-left text-xs font-semibold transition ${
                              isSelected
                                ? "bg-teal-800 text-white border-teal-800 shadow-xs"
                                : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                            }`}
                          >
                            {language === "ar" ? opt.textAr : opt.textEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Crisis Notice Warning if triggered */}
              {crisisDetected && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-red-900 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 font-bold text-red-700">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <span>{language === "ar" ? "تنبيه سريري فوري للسلامة" : "Immediate Clinical Safety Alert"}</span>
                  </div>
                  <p className="leading-relaxed">
                    {language === "ar"
                      ? "لاحظنا إشارتك لضيق نفسي حاد. نوصي بالتواصل الفوري مع خط الطوارئ الوطني للأمانة العامة للصحة النفسية (16328) المجاني على مدار 24 ساعة لضمان سلامتك."
                      : "We detected acute distress. Please consider contacting the national 24/7 mental health crisis hotline (16328)."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Matching Results Screen */}
          {step === 5 && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-400">
              <div className="text-center max-w-lg mx-auto space-y-2">
                <div className="w-14 h-14 bg-teal-50 border border-teal-200 rounded-3xl flex items-center justify-center text-teal-800 mx-auto shadow-sm">
                  <Sparkles className="w-7 h-7 text-terracotta-600 animate-pulse" />
                </div>
                <h2 className="text-2xl font-black text-teal-950">
                  {language === "ar" ? "تم مطابقة حالتك بنجاح!" : "Clinical Matching Complete!"}
                </h2>
                <p className="text-xs text-gray-600">
                  {language === "ar"
                    ? "بناءً على شكواك وأهدافك العلاجية، رشحنا لك أفضل 3 استشاريين متخصصين في حالتك:"
                    : "Based on your clinical intake, here are your top 3 matched consultant specialists:"}
                </p>
              </div>

              {/* Recommended Doctors Cards */}
              <div className="space-y-4">
                {matchedResults.slice(0, 3).map(({ doctor, matchPercentage }, index) => (
                  <div
                    key={doctor.id}
                    className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ${
                      index === 0
                        ? "bg-teal-50/40 border-teal-600 ring-2 ring-teal-600/30 shadow-lg"
                        : "bg-white border-alabaster-border hover:shadow-md"
                    }`}
                  >
                    {/* Doctor Info Left */}
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img
                          src={doctor.avatar}
                          alt={doctor.fullName}
                          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow"
                        />
                        {index === 0 && (
                          <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-terracotta-600 text-white text-[10px] font-extrabold shadow">
                            {language === "ar" ? "الأنسب لك" : "Best Match"}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-teal-950">
                            {language === "ar" ? doctor.fullName : doctor.fullNameEn}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-sage-100 text-sage-900 text-[11px] font-black">
                            {matchPercentage}% {language === "ar" ? "تطابق" : "Match"}
                          </span>
                        </div>

                        <p className="text-xs text-sage-700 font-semibold">
                          {language === "ar" ? doctor.title : doctor.titleEn}
                        </p>

                        <p className="text-[11px] text-gray-500 line-clamp-1 max-w-md">
                          {language === "ar" ? doctor.bio : doctor.bioEn}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-gray-600 pt-1">
                          <span className="font-bold text-teal-900">
                            {formatCurrency(doctor.sessionRateEGP, "EGP", language)}
                          </span>
                          <span>•</span>
                          <span>{doctor.yearsOfExperience} {language === "ar" ? "سنة خبرة" : "yrs exp"}</span>
                          <span>•</span>
                          <span className="text-amber-600 font-bold">★ {doctor.rating}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button Right */}
                    <div className="w-full md:w-auto flex md:flex-col items-center gap-2">
                      <Link
                        href={`/booking/${doctor.id}`}
                        className={`w-full md:w-44 py-3 rounded-xl font-extrabold text-xs text-center shadow-md transition ${
                          index === 0
                            ? "bg-terracotta-600 hover:bg-terracotta-700 text-white"
                            : "bg-teal-800 hover:bg-teal-900 text-white"
                        }`}
                      >
                        {language === "ar" ? "احجز جلستك مع الطبيب" : "Book Initial Session"}
                      </Link>
                      <span className="text-[10px] text-gray-400 hidden md:block">
                        {language === "ar" ? doctor.nextAvailableSlot : doctor.nextAvailableSlotEn}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Direct Link to full Directory */}
              <div className="text-center pt-2">
                <Link
                  href="/therapists"
                  className="text-xs font-bold text-teal-800 hover:underline"
                >
                  {language === "ar" ? "أو تصفح جميع أطباء المركز الـ 35+" : "Or browse all 35+ licensed specialists"}
                </Link>
              </div>
            </div>
          )}

          {/* Wizard Footer Navigation Controls (Steps 1-4) */}
          {step < 5 && (
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  <ArrowPrev className="w-4 h-4" />
                  <span>{language === "ar" ? "السابق" : "Back"}</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => {
                  if (step === 4) {
                    handleCompleteIntake();
                    setStep(5);
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={step === 1 && selectedConcerns.length === 0}
                className="flex items-center gap-2 px-7 py-3 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-40 text-white text-xs font-extrabold shadow-md transition"
              >
                <span>{step === 4 ? (language === "ar" ? "عرض الأطباء المطابقين" : "Find Matches") : (language === "ar" ? "المتابعة" : "Next")}</span>
                <ArrowNext className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IntakeWizardPage() {
  return (
    <Suspense fallback={<div className="min-h-[85vh] flex items-center justify-center text-teal-900 font-bold">جاري تحميل الاستبيان...</div>}>
      <IntakeWizardContent />
    </Suspense>
  );
}
