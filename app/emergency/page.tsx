"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PhoneCall,
  ShieldAlert,
  Heart,
  Sparkles,
  Wind,
  Eye,
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { BreathingExerciseModal } from "@/components/crisis/BreathingExerciseModal";
import { SensoryGroundingModal } from "@/components/crisis/SensoryGroundingModal";

interface EmergencyLine {
  countryAr: string;
  countryEn: string;
  number: string;
  nameAr: string;
  nameEn: string;
  hours: string;
}

const emergencyHotlines: EmergencyLine[] = [
  {
    countryAr: "مصر",
    countryEn: "Egypt",
    number: "16328",
    nameAr: "الخط الساخن للأمانة العامة للصحة النفسية",
    nameEn: "General Secretariat of Mental Health Hotline",
    hours: "24/7 مجاناً",
  },
  {
    countryAr: "المملكة العربية السعودية",
    countryEn: "Saudi Arabia",
    number: "937",
    nameAr: "مركز اتصال وزارة الصحة (استشارات نفسية)",
    nameEn: "Ministry of Health Emergency Consultations",
    hours: "24/7 مجاناً",
  },
  {
    countryAr: "الإمارات العربية المتحدة",
    countryEn: "UAE",
    number: "8004673",
    nameAr: "الخط الوطني للتعزيز النفسي (Hope)",
    nameEn: "National Mental Support Line (HOPE)",
    hours: "8:00 AM - 8:00 PM",
  },
  {
    countryAr: "الكويت",
    countryEn: "Kuwait",
    number: "153",
    nameAr: "خط الأمان والاستشارات النفسية",
    nameEn: "Mental Health Support Hotline",
    hours: "24/7",
  },
  {
    countryAr: "قطر",
    countryEn: "Qatar",
    number: "16000",
    nameAr: "خط المساعدة للصحة النفسية (مؤسسة حمد)",
    nameEn: "Hamad Medical Mental Health Helpline",
    hours: "7:00 AM - 3:00 PM",
  },
];

export default function EmergencyPage() {
  const { language } = useLanguage();
  const [showBreathing, setShowBreathing] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Main Alert Card */}
        <div className="bg-red-700 text-white rounded-3xl p-6 sm:p-10 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-red-600 rounded-full opacity-40 pointer-events-none" />
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-800 text-red-100 text-xs font-bold border border-red-500">
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <span>{language === "ar" ? "بروتوكول التدخل في الأزمات الحادة" : "Acute Crisis Intervention Protocol"}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black leading-tight">
            {language === "ar"
              ? "إذا كنت تشعر بخطر مباشر أو أفكار لإيذاء النفس، لست وحدك."
              : "If you are in immediate distress or danger, you are not alone."}
          </h1>

          <p className="text-xs sm:text-sm text-red-100 max-w-2xl leading-relaxed">
            {language === "ar"
              ? "العلاج عن بُعد ليس بديلاً عن التدخل الفوري في الطوارئ المهددة للحياة. يرجى الاتصال فوراً بأحد الخطوط الساخنة الوطنية المعتمدة أدناه أو التوجه لأقرب طوارئ مستشفى نفسي."
              : "Telehealth is not a substitute for emergency intervention. Please call one of the verified national crisis hotlines below or head to the nearest psychiatric emergency center."}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href="tel:16328"
              className="px-6 py-3.5 bg-white text-red-700 hover:bg-red-50 rounded-2xl font-black text-sm shadow-lg transition flex items-center gap-2"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{language === "ar" ? "اتصال فوري بطوارئ مصر: 16328" : "Call Egypt Crisis: 16328"}</span>
            </a>
            <a
              href="tel:937"
              className="px-5 py-3.5 bg-red-800/80 hover:bg-red-800 text-white rounded-2xl font-bold text-xs border border-red-500 transition flex items-center gap-2"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "طوارئ السعودية: 937" : "Call KSA: 937"}</span>
            </a>
          </div>
        </div>

        {/* Immediate Somatic De-Escalation Tools */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-alabaster-border shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Sparkles className="w-5 h-5 text-teal-800" />
            <h3 className="font-extrabold text-base text-teal-950">
              {language === "ar" ? "تمارين التهدئة الفورية للجهاز العصبي" : "Immediate Somatic De-Escalation Tools"}
            </h3>
          </div>
          <p className="text-xs text-gray-500">
            {language === "ar"
              ? "إذا كنت تمر بنوبة هلع أو تسارع في ضربات القلب، استخدم هذه الأدوات التفاعلية للمساعدة على استعادة التوازن:"
              : "Use these interactive somatic tools to de-escalate panic attacks and regulate your autonomic nervous system:"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => setShowGrounding(true)}
              className="p-5 rounded-2xl bg-teal-50 hover:bg-teal-100/70 border border-teal-200 text-start rtl:text-right ltr:text-left transition flex items-center gap-4 group"
            >
              <div className="p-3.5 rounded-2xl bg-teal-800 text-white group-hover:scale-105 transition">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-sm text-teal-950">
                  {language === "ar" ? "تمرين التأريض 5-4-3-2-1" : "5-4-3-2-1 Sensory Grounding"}
                </h4>
                <p className="text-[11px] text-teal-700 mt-0.5">
                  {language === "ar" ? "تسكين الهلع عبر استدعاء الحواس الخمس" : "Soothe panic by engaging your five senses"}
                </p>
              </div>
            </button>

            <button
              onClick={() => setShowBreathing(true)}
              className="p-5 rounded-2xl bg-sage-50 hover:bg-sage-100/70 border border-sage-200 text-start rtl:text-right ltr:text-left transition flex items-center gap-4 group"
            >
              <div className="p-3.5 rounded-2xl bg-sage-700 text-white group-hover:scale-105 transition">
                <Wind className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-sm text-teal-950">
                  {language === "ar" ? "تمرين التنفس المهدئ 4-7-8" : "4-7-8 Relaxing Breath Technique"}
                </h4>
                <p className="text-[11px] text-sage-700 mt-0.5">
                  {language === "ar" ? "تحفيز العصب الحائر وتخفيض نبضات القلب" : "Stimulate vagus nerve and slow heart rate"}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* National Hotlines Directory */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-alabaster-border shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <PhoneCall className="w-5 h-5 text-teal-800" />
            <h3 className="font-extrabold text-base text-teal-950">
              {language === "ar" ? "دليل الخطوط الساخنة للطوارئ النفسية في الوطن العربي" : "Arab Mental Health Emergency Directory"}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyHotlines.map((hl, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-alabaster-base border border-alabaster-border flex items-center justify-between hover:border-teal-300 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-teal-950">{language === "ar" ? hl.countryAr : hl.countryEn}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[9px] font-bold border border-emerald-200">
                      {hl.hours}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">{language === "ar" ? hl.nameAr : hl.nameEn}</p>
                </div>

                <a
                  href={`tel:${hl.number}`}
                  className="px-3.5 py-2 bg-teal-900 hover:bg-teal-800 text-white rounded-xl font-mono font-bold text-xs shadow flex items-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span dir="ltr">{hl.number}</span>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Plan Handoff */}
        <div className="bg-teal-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 text-center sm:text-start rtl:sm:text-right ltr:sm:text-left">
            <h4 className="font-black text-base">
              {language === "ar" ? "هل قمت بإعداد خطة الأمان النفسي المعتمدة؟" : "Have you created your personalized safety plan?"}
            </h4>
            <p className="text-xs text-sage-200">
              {language === "ar"
                ? "يمكنك كتابة مؤشراتك التحذيرية وأرقام المقربين وتنزيل بطاقة الأمان الشخصية."
                : "Identify warning triggers, coping strategies, and trusted contacts."}
            </p>
          </div>
          <Link
            href="/safety-plan"
            className="px-6 py-3 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition whitespace-nowrap"
          >
            {language === "ar" ? "فتح خطة الأمان الشخصية" : "Open Crisis Safety Plan"}
          </Link>
        </div>
      </div>

      {/* Modals */}
      <BreathingExerciseModal isOpen={showBreathing} onClose={() => setShowBreathing(false)} />
      <SensoryGroundingModal isOpen={showGrounding} onClose={() => setShowGrounding(false)} />
    </div>
  );
}
