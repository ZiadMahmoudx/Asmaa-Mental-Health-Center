"use client";

import React, { useState, useEffect } from "react";
import { X, Wind, Play, Pause, RefreshCw, Volume2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface BreathingExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BreathingExerciseModal: React.FC<BreathingExerciseModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [phase, setPhase] = useState<"INHALE" | "HOLD" | "EXHALE">("INHALE");
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [isRunning, setIsRunning] = useState(true);
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !isRunning) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (phase === "INHALE") {
            setPhase("HOLD");
            return 7;
          } else if (phase === "HOLD") {
            setPhase("EXHALE");
            return 8;
          } else {
            setPhase("INHALE");
            setCycleCount((c) => c + 1);
            return 4;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isRunning, phase]);

  if (!isOpen) return null;

  const getPhaseText = () => {
    if (phase === "INHALE") {
      return language === "ar" ? "شهيق عميق من الأنف..." : "Inhale deeply through nose...";
    }
    if (phase === "HOLD") {
      return language === "ar" ? "احبس النفس بهدوء..." : "Hold breath gently...";
    }
    return language === "ar" ? "زفير بطيء من الفم..." : "Exhale slowly through mouth...";
  };

  const getPhaseInstruction = () => {
    if (phase === "INHALE") {
      return language === "ar" ? "املأ رئتيك واسترخِ كتفيك (4 ثوانٍ)" : "Fill your lungs, relax your shoulders (4s)";
    }
    if (phase === "HOLD") {
      return language === "ar" ? "ثبّت الهواء دون أي شد عضلي (7 ثوانٍ)" : "Maintain calmness without straining (7s)";
    }
    return language === "ar" ? "أفرغ الهواء تماماً كأنك تطفئ شمعة بعيدة (8 ثوانٍ)" : "Release all tension slowly (8s)";
  };

  const getScaleClass = () => {
    if (phase === "INHALE") return "scale-125 bg-teal-500/30 border-teal-500";
    if (phase === "HOLD") return "scale-125 bg-amber-500/30 border-amber-500";
    return "scale-90 bg-sage-500/20 border-sage-500";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center relative border border-teal-100 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-teal-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-sage-100/50 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200/60 rounded-full text-xs font-bold text-teal-800 mb-4">
          <Wind className="w-3.5 h-3.5" />
          <span>{language === "ar" ? "تمرين التنفس 4-7-8 لتهدئة نوبة الهلع" : "4-7-8 Panic Relief Breathing"}</span>
        </div>

        <h3 className="text-xl font-black text-gray-900 mb-1">
          {language === "ar" ? "استعد للهدوء واستعادة توازنك" : "Restore Your Calm & Balance"}
        </h3>
        <p className="text-xs text-gray-500 mb-8 max-w-xs mx-auto">
          {language === "ar"
            ? "يساعد هذا النمط على تنبيه العصب الحائر وتخفيض معدل نبضات القلب فوراً."
            : "Stimulates the vagus nerve to rapidly lower heart rate and reduce physiological panic."}
        </p>

        {/* Dynamic Breathing Bubble */}
        <div className="my-8 relative flex items-center justify-center h-52">
          {/* Pulsing ring outer */}
          <div
            className={`w-48 h-48 rounded-full border-4 transition-all duration-1000 ease-in-out flex flex-col items-center justify-center ${getScaleClass()}`}
          >
            <span className="text-4xl font-extrabold text-teal-950 font-mono tracking-tight">
              {secondsLeft}
            </span>
            <span className="text-xs font-bold text-teal-900 mt-1 uppercase tracking-wider">
              {phase}
            </span>
          </div>
        </div>

        {/* Phase instruction */}
        <div className="mb-6 h-12 flex flex-col justify-center">
          <p className="text-base font-bold text-teal-900">{getPhaseText()}</p>
          <p className="text-xs text-gray-500">{getPhaseInstruction()}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-xs shadow-md transition"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? (language === "ar" ? "إيقاف مؤقت" : "Pause") : (language === "ar" ? "متابعة" : "Resume")}</span>
          </button>
          <button
            onClick={() => {
              setPhase("INHALE");
              setSecondsLeft(4);
              setCycleCount(0);
              setIsRunning(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{language === "ar" ? "إعادة البدء" : "Restart"}</span>
          </button>
        </div>

        <p className="text-[11px] text-gray-400 mt-5">
          {language === "ar"
            ? `أكملت ${cycleCount} دورات تنفسية كاملة`
            : `Completed ${cycleCount} full breathing cycles`}
        </p>
      </div>
    </div>
  );
};
