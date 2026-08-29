"use client";

import React, { useState } from "react";
import { Eye, Hand, Volume2, Flower2, Heart, CheckCircle2, ChevronLeft, ChevronRight, X, Sparkles, RotateCcw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface StepData {
  step: number;
  count: number;
  icon: any;
  titleAr: string;
  titleEn: string;
  instructionAr: string;
  instructionEn: string;
  examplesAr: string[];
  examplesEn: string[];
}

const groundingSteps: StepData[] = [
  {
    step: 1,
    count: 5,
    icon: Eye,
    titleAr: "5 أشياء تراها حولك في الغرفة",
    titleEn: "5 Things You Can See",
    instructionAr: "انظر حولك ولاحظ 5 تفاصيل بصرية دقيقة (لون الحائط، نقش السجادة، ضوء المصباح، شكل الباب، يديك).",
    instructionEn: "Look around and notice 5 visual details (a picture, a pen, light reflection, the door, your hands).",
    examplesAr: ["مصباح الغرفة", "لون الهاتف", "حافة النافذة", "كوب الماء", "ظل الكرسي"],
    examplesEn: ["Lamp", "Phone color", "Window frame", "Water glass", "Chair shadow"],
  },
  {
    step: 2,
    count: 4,
    icon: Hand,
    titleAr: "4 أشياء يمكنك لمسها والإحساس بملمسها",
    titleEn: "4 Things You Can Touch",
    instructionAr: "المس 4 أسطح مختلفة ولاحظ ملمسها وحرارتها (قماش ملابسك، برودة الطاولة، ملمس شعرك، الأرض تحت قدميك).",
    instructionEn: "Touch 4 different textures and notice their physical sensations (your clothing, cold table, hair, the floor under your feet).",
    examplesAr: ["ملمس القميص القطني", "برودة سطح المكتب", "سوار الساعة", "أرضية الغرفة"],
    examplesEn: ["Cotton shirt", "Cold desk", "Watch band", "Firm floor"],
  },
  {
    step: 3,
    count: 3,
    icon: Volume2,
    titleAr: "3 أصوات يمكنك الاستماع إليها بوضوح",
    titleEn: "3 Things You Can Hear",
    instructionAr: "أغمض عينيك لثوانٍ وركز في الأصوات المحيطة (صوت المكيف، حركة السيارات بالخارج، صوت تنفسك).",
    instructionEn: "Listen carefully for 3 ambient sounds (the AC hum, distant traffic, birds, your own breathing).",
    examplesAr: ["صوت دقات الساعة", "حفيف الهواء", "صوت تنفسك المنتظم"],
    examplesEn: ["Clock ticking", "Breeze or AC", "Rhythmic breathing"],
  },
  {
    step: 4,
    count: 2,
    icon: Flower2,
    titleAr: "شيئان يمكنك شمهما أو تذكر رائحتهما",
    titleEn: "2 Things You Can Smell",
    instructionAr: "لاحظ أي رائحة في الجو (عطر ملابسك، رائحة القهوة، أو هواء الغرفة المنعش).",
    instructionEn: "Notice 2 scents in the air (your perfume, fresh air, coffee, or soap).",
    examplesAr: ["رائحة العطر الهادئ", "هواء الغرفة النقي"],
    examplesEn: ["Gentle scent", "Clean room air"],
  },
  {
    step: 5,
    count: 1,
    icon: Heart,
    titleAr: "شيء واحد يمكنك تذوقه أو نفس عميق مطمئن",
    titleEn: "1 Thing You Can Taste & Deep Breath",
    instructionAr: "ركز على طعم كوب ماء، أو خذ نفساً بطيئاً عميقاً واستشعر ثبات قدميك على الأرض وسلامتك الكاملة الآن.",
    instructionEn: "Take a sip of water or take one slow, deep breath. Anchor in the present moment: You are safe.",
    examplesAr: ["رشفة ماء منعشة", "نَفَس بطني عميق"],
    examplesEn: ["Sip of water", "Deep grounding breath"],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SensoryGroundingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen) return null;

  const currentStep = groundingSteps[currentStepIdx];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (currentStepIdx < groundingSteps.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
      setIsCompleted(false);
    }
  };

  const handleRestart = () => {
    setCurrentStepIdx(0);
    setIsCompleted(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-teal-100 relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!isCompleted ? (
          <div className="space-y-6 text-center">
            {/* Header / Pill */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>{language === "ar" ? "تقنية التأريض الحسي 5-4-3-2-1" : "5-4-3-2-1 Sensory Grounding"}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-teal-950">
                {language === "ar" ? "تسكين نوبة الهلع واستعادة التوازن" : "De-escalate Panic & Regain Control"}
              </h3>
            </div>

            {/* Step Progress Dots */}
            <div className="flex justify-center gap-2">
              {groundingSteps.map((s, idx) => (
                <div
                  key={s.step}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStepIdx
                      ? "w-8 bg-terracotta-600"
                      : idx < currentStepIdx
                      ? "w-2.5 bg-teal-800"
                      : "w-2.5 bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {/* Step Icon Card */}
            <div className="w-24 h-24 rounded-3xl bg-teal-50 border-2 border-teal-200 text-teal-800 flex items-center justify-center mx-auto shadow-md relative">
              <Icon className="w-12 h-12 text-teal-800 animate-pulse" />
              <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-terracotta-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                {currentStep.count}
              </span>
            </div>

            {/* Step Instructions */}
            <div className="space-y-2 max-w-sm mx-auto">
              <h4 className="font-extrabold text-base text-teal-950">
                {language === "ar" ? currentStep.titleAr : currentStep.titleEn}
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                {language === "ar" ? currentStep.instructionAr : currentStep.instructionEn}
              </p>
            </div>

            {/* Example Badges */}
            <div className="flex flex-wrap justify-center gap-1.5 pt-2">
              {(language === "ar" ? currentStep.examplesAr : currentStep.examplesEn).map((ex, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-xl bg-alabaster-base border border-alabaster-border text-[11px] font-semibold text-gray-700"
                >
                  ✓ {ex}
                </span>
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStepIdx === 0}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 disabled:opacity-30 transition"
              >
                {language === "ar" ? "السابق" : "Back"}
              </button>

              <span className="text-xs text-gray-400 font-mono">
                {currentStepIdx + 1} / {groundingSteps.length}
              </span>

              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-xs shadow-md transition"
              >
                {currentStepIdx === groundingSteps.length - 1
                  ? (language === "ar" ? "إتمام التمرين" : "Finish")
                  : (language === "ar" ? "التالي" : "Next")}
              </button>
            </div>
          </div>
        ) : (
          /* Completion Screen */
          <div className="space-y-6 text-center py-4">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-teal-950">
                {language === "ar" ? "أحسنت! نبضك وتنفسك يستقران الآن" : "Well Done! Grounding Complete"}
              </h3>
              <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                {language === "ar"
                  ? "ساعدت جهازك العصبي على الخروج من وضع الاستثارة الحادة والعودة إلى اللحظة الحالية بأمان."
                  : "You guided your nervous system back into the parasympathetic safety state."}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-xs rounded-2xl shadow-lg transition"
              >
                {language === "ar" ? "العودة للمنصة ومتابعة يومك" : "Return to Platform"}
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-800 font-bold transition flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "إعادة التمرين مرة أخرى" : "Repeat Grounding Exercise"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
