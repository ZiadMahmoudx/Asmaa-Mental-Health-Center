"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Heart,
  UserCheck,
  PhoneCall,
  Sparkles,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Lock,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { SafetyPlan } from "@/types/telehealth";

export default function SafetyPlanPage() {
  const { language } = useLanguage();

  const [safetyPlan, setSafetyPlan] = useState<SafetyPlan>({
    id: "sp-1",
    patientId: "pat-1",
    warningSigns: [
      "الانعزال التام وإغلاق الهاتف لأكثر من يوم",
      "تسارع نبضات القلب وشعور بالاختناق المفاجئ",
      "أفكار سلبية متكررة مثل (لا فائدة من المحاولة)",
    ],
    internalCopingStrategies: [
      "ممارسة تمرين التنفس 4-7-8 لمدة 5 دقائق متواصلة",
      "استخدام تقنية التأريض 5-4-3-2-1 لتسكين التوتر",
      "الاستحمام بماء فاتر وكتابة الأفكار في سجل الـ CBT",
    ],
    socialDistractions: [
      { name: "الجلوس في حديقة هادئة أو شرفة المنزل" },
      { name: "الاتصال بصديقي المقرب (عمر) والتحدث في مواضيع عامة" },
    ],
    trustedContacts: [
      { name: "سارة (الأخت)", phone: "+20 100 123 4567", relationship: "أخت" },
      { name: "مريم (صديقة مقربة)", phone: "+20 111 987 6543", relationship: "صديقة" },
    ],
    professionalResources: [
      { name: "د. أسماء عبد الوهاب (الاستشاري المعالج)", phone: "+20 2 2849 0192", address: "مركز أسما للصحة النفسية" },
      { name: "الخط الساخن للأمانة العامة للصحة النفسية (مصر)", phone: "16328", address: "خدمة حكومية مجانية 24/7" },
    ],
    environmentSafetySteps: [
      "الابتعاد عن الأماكن المرتفعة أو الأدوات الحادة عند اشتداد النوبة",
      "تسليم الأدوية لأحد أفراد الأسرة لتنظيم الجرعات",
    ],
    updatedAt: new Date().toISOString().split("T")[0],
  });

  const [newWarningSign, setNewWarningSign] = useState("");
  const [newCoping, setNewCoping] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleAddWarning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarningSign.trim()) return;
    setSafetyPlan({
      ...safetyPlan,
      warningSigns: [...safetyPlan.warningSigns, newWarningSign.trim()],
    });
    setNewWarningSign("");
  };

  const handleAddCoping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoping.trim()) return;
    setSafetyPlan({
      ...safetyPlan,
      internalCopingStrategies: [...safetyPlan.internalCopingStrategies, newCoping.trim()],
    });
    setNewCoping("");
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-alabaster-border shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-900 text-xs font-bold border border-red-200">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span>{language === "ar" ? "بروتوكول ستانلي-براون المعتمد (SPI)" : "Stanley-Brown Safety Protocol"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-teal-950">
              {language === "ar" ? "خطة الأمان النفسي الشخصية للطوارئ" : "Personalized Psychiatric Safety Plan"}
            </h1>
            <p className="text-xs text-gray-500 max-w-xl">
              {language === "ar"
                ? "خطة مكتوبة مسبقاً لمساعدتك على تجاوز نوبات الضيق النفسي الحاد والهلع عبر خطوات تدريجية واضحة ومحددة."
                : "A step-by-step evidence-based safety plan to help you navigate acute emotional crises safely."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-2xl font-bold text-xs shadow transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>{language === "ar" ? "طباعة بطاقة الأمان" : "Print Plan"}</span>
            </button>
          </div>
        </div>

        {/* Safety Plan Form Steps */}
        <div className="space-y-6">
          {/* STEP 1: Warning Signs */}
          <div className="bg-white rounded-3xl p-6 border border-alabaster-border shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-7 h-7 rounded-xl bg-teal-900 text-white font-black text-xs flex items-center justify-center">1</span>
              <h3 className="font-extrabold text-sm text-teal-950">
                {language === "ar" ? "المؤشرات التحذيرية والمحفزات (Warning Signs)" : "Warning Signs & Triggers"}
              </h3>
            </div>
            <p className="text-xs text-gray-500">أفكار، مشاعر، أو تصرفات تدل على أن الأزمة النفسية قد تبدأ في التصاعد:</p>

            <div className="space-y-2">
              {safetyPlan.warningSigns.map((ws, idx) => (
                <div key={idx} className="p-3 bg-alabaster-base rounded-2xl border border-alabaster-border text-xs flex items-center justify-between text-gray-800">
                  <span>• {ws}</span>
                  <button
                    onClick={() => setSafetyPlan({ ...safetyPlan, warningSigns: safetyPlan.warningSigns.filter((_, i) => i !== idx) })}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddWarning} className="flex gap-2 pt-2">
              <input
                type="text"
                value={newWarningSign}
                onChange={(e) => setNewWarningSign(e.target.value)}
                placeholder="أضف مؤشراً تحذيرياً (مثال: رغبة ملحة في الانعزال)..."
                className="flex-1 p-2.5 rounded-xl border border-gray-200 text-xs"
              />
              <button type="submit" className="px-4 py-2.5 bg-teal-800 text-white rounded-xl text-xs font-bold">
                + إضافة
              </button>
            </form>
          </div>

          {/* STEP 2: Internal Coping Strategies */}
          <div className="bg-white rounded-3xl p-6 border border-alabaster-border shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-7 h-7 rounded-xl bg-teal-900 text-white font-black text-xs flex items-center justify-center">2</span>
              <h3 className="font-extrabold text-sm text-teal-950">
                {language === "ar" ? "استراتيجيات التأقلم الذاتية (Coping Strategies)" : "Internal Coping Strategies"}
              </h3>
            </div>
            <p className="text-xs text-gray-500">أنشطة وتمارين يمكنك القيام بها بمفردك لتشتيت التوتر وتهدئة جهازك العصبي:</p>

            <div className="space-y-2">
              {safetyPlan.internalCopingStrategies.map((cs, idx) => (
                <div key={idx} className="p-3 bg-alabaster-base rounded-2xl border border-alabaster-border text-xs flex items-center justify-between text-gray-800">
                  <span>• {cs}</span>
                  <button
                    onClick={() => setSafetyPlan({ ...safetyPlan, internalCopingStrategies: safetyPlan.internalCopingStrategies.filter((_, i) => i !== idx) })}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCoping} className="flex gap-2 pt-2">
              <input
                type="text"
                value={newCoping}
                onChange={(e) => setNewCoping(e.target.value)}
                placeholder="أضف طريقة تأقلم ذاتية (مثال: الاستماع لموسيقى هادئة أو المشي)..."
                className="flex-1 p-2.5 rounded-xl border border-gray-200 text-xs"
              />
              <button type="submit" className="px-4 py-2.5 bg-teal-800 text-white rounded-xl text-xs font-bold">
                + إضافة
              </button>
            </form>
          </div>

          {/* STEP 3 & 4: Contacts & Emergency Hotlines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-3xl p-6 border border-alabaster-border shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <span className="w-6 h-6 rounded-lg bg-teal-900 text-white font-black text-xs flex items-center justify-center">3</span>
                <h4 className="font-bold text-xs text-teal-950">جهات الاتصال المقربة لطلب المساعدة:</h4>
              </div>
              <div className="space-y-2 text-xs">
                {safetyPlan.trustedContacts.map((tc, idx) => (
                  <div key={idx} className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-teal-950 block">{tc.name} ({tc.relationship})</span>
                      <span className="text-[11px] text-gray-500 font-mono" dir="ltr">{tc.phone}</span>
                    </div>
                    <a href={`tel:${tc.phone}`} className="p-2 bg-teal-800 text-white rounded-xl">
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-red-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <span className="w-6 h-6 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center">4</span>
                <h4 className="font-bold text-xs text-red-950">المصادر الطبية والخط الساخن:</h4>
              </div>
              <div className="space-y-2 text-xs">
                {safetyPlan.professionalResources.map((pr, idx) => (
                  <div key={idx} className="p-3 bg-red-50/70 rounded-xl border border-red-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-red-950 block">{pr.name}</span>
                      <span className="text-[11px] text-red-800 font-mono font-bold" dir="ltr">{pr.phone}</span>
                    </div>
                    <a href={`tel:${pr.phone}`} className="p-2 bg-red-600 text-white rounded-xl shadow">
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Save Action */}
          <div className="pt-4 flex items-center justify-between">
            <Link href="/dashboard/patient" className="text-xs font-bold text-teal-800 hover:underline">
              ← العودة لبوابة المريض
            </Link>

            <button
              onClick={handleSave}
              className="px-8 py-3 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-2xl shadow-lg transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaved ? "تم حفظ خطة الأمان بنجاح!" : "حفظ خطة الأمان في ملفي الطبي"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
