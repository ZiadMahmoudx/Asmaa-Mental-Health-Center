"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  Lock,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  Video,
  UserCheck,
  ChevronRight,
  Heart,
  HelpCircle,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { formatCurrency } from "@/lib/utils";
import { MOCK_SUPPORT_CIRCLES } from "@/data/mockCircles";
import { GroupSupportCircle } from "@/types/telehealth";

export default function SupportCirclesPage() {
  const { language } = useLanguage();
  const { currentUser } = useTelehealth();

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedCircle, setSelectedCircle] = useState<GroupSupportCircle | null>(null);
  const [anonymousAlias, setAnonymousAlias] = useState("نور 82");
  const [isBooked, setIsBooked] = useState(false);

  const generateNewAlias = () => {
    const prefixes = ["أمل", "نور", "سما", "هدوء", "شروق", "سلام", "ريان", "بدر"];
    const randomNum = Math.floor(10 + Math.random() * 90);
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    setAnonymousAlias(`${randomPrefix} ${randomNum}`);
  };

  const filteredCircles = selectedCategory === "ALL"
    ? MOCK_SUPPORT_CIRCLES
    : MOCK_SUPPORT_CIRCLES.filter((c) => c.category === selectedCategory);

  const handleBookCircle = () => {
    setIsBooked(true);
    setTimeout(() => {
      setIsBooked(false);
      setSelectedCircle(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 text-teal-900 text-xs font-bold border border-teal-200">
            <Users className="w-3.5 h-3.5 text-teal-700" />
            <span>{language === "ar" ? "دوائر الدعم النفسي الجماعي المغلقة" : "Confidential Group Therapy Circles"}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-teal-950">
            {language === "ar" ? "لست وحدك في رحلة التعافي" : "Heal Together in Clinical Support Circles"}
          </h1>

          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            {language === "ar"
              ? "مجموعات علاجية مصغرة (بحد أقصى 8 مشاركين) يقودها استشاريو الطب النفسي، لتبادل الخبرات وتطبيق بروتوكولات التعافي بهوية مستعارة وسرية تامة."
              : "Small closed clinical groups (max 8 participants) facilitated by senior consultant psychiatrists under strict anonymous identity protocols."}
          </p>
        </div>

        {/* Anonymous Identity Shield Card */}
        <div className="bg-white rounded-3xl p-6 border border-alabaster-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 text-teal-900 rounded-2xl">
              <Lock className="w-6 h-6 text-teal-800" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-teal-950">
                {language === "ar" ? "هويتك المستعارة الآمنة في الجلسات الجماعية:" : "Your Clinical Anonymous Alias:"}
              </h4>
              <p className="text-xs text-gray-500">
                {language === "ar"
                  ? "يتم إخفاء اسمك وبريدك الإلكتروني الحقيقي تلقائياً لحماية خصوصيتك 100%."
                  : "Your real name and email are strictly hidden from other participants."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-alabaster-base px-4 py-2 rounded-2xl border border-alabaster-border">
            <span className="font-black text-teal-900 text-sm font-mono">{anonymousAlias}</span>
            <button
              onClick={generateNewAlias}
              className="text-xs text-terracotta-600 hover:underline font-bold px-2"
            >
              {language === "ar" ? "تغيير الاسم" : "Randomize"}
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { id: "ALL", labelAr: "جميع الدوائر", labelEn: "All Circles" },
            { id: "PANIC", labelAr: "نوبات الهلع والرهاب", labelEn: "Panic & Agoraphobia" },
            { id: "MATERNAL", labelAr: "اكتئاب ما بعد الولادة", labelEn: "Maternal Wellness" },
            { id: "GRIEF", labelAr: "الفقد والحزن", labelEn: "Grief & Bereavement" },
            { id: "BURNOUT", labelAr: "الاحتراق الوظيفي", labelEn: "Burnout" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                selectedCategory === cat.id
                  ? "bg-teal-800 text-white shadow-md"
                  : "bg-white text-gray-700 border border-alabaster-border hover:bg-gray-50"
              }`}
            >
              {language === "ar" ? cat.labelAr : cat.labelEn}
            </button>
          ))}
        </div>

        {/* Circles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCircles.map((circle) => (
            <div
              key={circle.id}
              className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 sm:p-8 space-y-6 flex flex-col justify-between hover:border-teal-300 transition group"
            >
              <div className="space-y-4">
                {/* Badge & Seat Counter */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                    {language === "ar" ? circle.badgeAr : circle.badgeEn}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                    <Users className="w-3.5 h-3.5 text-teal-800" />
                    <span>{circle.currentParticipants} / {circle.maxParticipants} مشاركين</span>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="font-black text-lg text-teal-950 group-hover:text-teal-800 transition">
                    {language === "ar" ? circle.titleAr : circle.titleEn}
                  </h3>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    {language === "ar" ? circle.descriptionAr : circle.descriptionEn}
                  </p>
                </div>

                {/* Facilitator Info */}
                <div className="flex items-center gap-3 p-3.5 bg-alabaster-base rounded-2xl border border-alabaster-border">
                  <img
                    src={circle.facilitatorAvatar}
                    alt={circle.facilitatorName}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <h5 className="font-extrabold text-xs text-teal-950">{circle.facilitatorName}</h5>
                    <p className="text-[11px] text-sage-800">{circle.facilitatorTitle}</p>
                  </div>
                </div>

                {/* Schedule & Duration */}
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-700" />
                    <span>{language === "ar" ? circle.scheduleAr : circle.scheduleEn}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-700" />
                    <span>{circle.durationMinutes} دقيقة لكل جلسة أسبوعية</span>
                  </div>
                </div>
              </div>

              {/* Price & Action */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">رسوم الاشتراك بالجلسة:</span>
                  <span className="text-xl font-black text-teal-900">
                    {formatCurrency(circle.priceEGP, "EGP", language)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCircle(circle)}
                  className="px-6 py-3 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition"
                >
                  {language === "ar" ? "حجز مقعد بالدائرة" : "Join Circle"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Booking Confirmation Modal */}
        {selectedCircle && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-800" />
                  <h3 className="font-black text-base text-teal-950">تأكيد الانضمام للدائرة العلاجية</h3>
                </div>
                <button onClick={() => setSelectedCircle(null)} className="text-gray-400 hover:text-gray-700 text-xs font-bold">
                  ✕
                </button>
              </div>

              <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100 space-y-2 text-xs">
                <h4 className="font-extrabold text-teal-950">{selectedCircle.titleAr}</h4>
                <p className="text-teal-800">المشرف: {selectedCircle.facilitatorName}</p>
                <p className="text-teal-800">الموعد: {selectedCircle.scheduleAr}</p>
                <div className="pt-2 border-t border-teal-200 flex justify-between font-bold text-teal-950">
                  <span>اسمك المعروض في الدائرة:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-teal-200">{anonymousAlias}</span>
                </div>
              </div>

              <div className="space-y-2 text-[11px] text-gray-500">
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>ميثاق السرية التامة: يمنع تصوير أو تسجيل أي نقاش داخل الدائرة.</span>
                </div>
              </div>

              {isBooked ? (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 font-bold text-xs text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>تم تأكيد حجز مقعدك بنجاح! تم إرسال رابط الجلسة إلى محفظتك وبريدك.</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleBookCircle}
                  className="w-full py-3.5 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-2xl shadow-lg transition"
                >
                  تأكيد الدفع ({formatCurrency(selectedCircle.priceEGP, "EGP", language)}) والانضمام
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
