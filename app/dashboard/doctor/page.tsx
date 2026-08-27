"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  Users,
  DollarSign,
  TrendingUp,
  Stethoscope,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  Activity,
  Award,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function DoctorDashboardPage() {
  const { language } = useLanguage();
  const { doctors, appointments, clinicalRecords, toggleDoctorSlot, currentUser } = useTelehealth();

  const doctor = doctors[0]; // Dr. Asmaa
  const [activeTab, setActiveTab] = useState<"AGENDA" | "PATIENTS" | "SOAP_NOTE" | "EARNINGS">("AGENDA");
  const [payoutRequested, setPayoutRequested] = useState(false);
  const [soapSaved, setSoapSaved] = useState(false);

  // SOAP State
  const [selectedDsmDisorder, setSelectedDsmDisorder] = useState("300.02 (Generalized Anxiety Disorder)");
  const [subjectiveNote, setSubjectiveNote] = useState("المريضة تشكو من تكرار نوبات القلق الصباحي والأرق وصعوبة الاستغراق في النوم منذ 3 أسابيع.");
  const [objectiveNote, setObjectiveNote] = useState("واعية، متجاوبة، تواصل بصري سليم، لا توجد علامات إجهاد حركي حاد، استبصار كامل.");
  const [assessmentNote, setAssessmentNote] = useState("اضطراب قلق معمم متوسط الشدة (GAD-7: 12). استجابة إيجابية لتمارين التنفس.");
  const [planNote, setPlanNote] = useState("الاستمرار على Escitalopram 10mg، ممارسة تمارين الـ CBT وسجل الأفكار، وجلسة متابعة بعد أسبوعين.");

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Doctor Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-alabaster-border shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={doctor.avatar}
              alt={doctor.fullName}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-teal-100 shadow-sm"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-teal-950">
                  {language === "ar" ? doctor.fullName : doctor.fullNameEn}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                  {language === "ar" ? "لوحة الاستشاري المعالج" : "Doctor Portal"}
                </span>
              </div>
              <p className="text-xs text-sage-700 font-semibold">{doctor.title}</p>
              <p className="text-[11px] text-gray-400 font-mono">ترخيص المزاولة: {doctor.licenseNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
            <div className="text-start md:text-end">
              <span className="text-[11px] text-gray-400 block">الأرباح المستحقة:</span>
              <span className="text-2xl font-black text-teal-900">
                {formatCurrency(currentUser.walletBalanceEGP, "EGP", language)}
              </span>
            </div>
            <Link
              href="/session/room-asm-101"
              className="px-5 py-3 bg-teal-800 hover:bg-teal-900 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center gap-2"
            >
              <Video className="w-4 h-4 text-emerald-300" />
              <span>دخول الغرفة الاستشارية</span>
            </Link>
          </div>
        </div>

        {/* Doctor Tabs */}
        <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-1">
          {[
            { id: "AGENDA", labelAr: "جدول المواعيد وإدارة التوفر", labelEn: "Slots & Schedule", icon: Calendar },
            { id: "PATIENTS", labelAr: "سجل المرضى والحالات السريرية", labelEn: "Patient Roster", icon: Users },
            { id: "SOAP_NOTE", labelAr: "محرر التوثيق السريري (SOAP & DSM-5)", labelEn: "SOAP Notes & DSM-5", icon: FileText },
            { id: "EARNINGS", labelAr: "الأرباح والتحليلات المالية", labelEn: "Earnings & Payouts", icon: DollarSign },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? "bg-teal-800 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{language === "ar" ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Slot Agenda Management */}
        {activeTab === "AGENDA" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-teal-950">
                  {language === "ar" ? "إدارة مواعيد واستشارات الأسبوع" : "Manage Available Slots"}
                </h3>
                <p className="text-xs text-gray-500">اضغط على أي موعد لتعديل حالته بين (متاح للحجز / محجوز / إجازة).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctor.availableSlots.map((slot) => {
                const isBooked = slot.isBooked;
                return (
                  <div
                    key={slot.id}
                    className={`p-5 rounded-3xl border transition-all ${
                      isBooked
                        ? "bg-amber-50/70 border-amber-200 shadow-sm"
                        : "bg-white border-alabaster-border shadow-xs hover:border-sage-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-teal-950">
                        {formatDateTime(slot.startTimeUTC, language)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isBooked ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {isBooked ? "محجوز لمريض" : "متاح للحجز"}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleDoctorSlot(doctor.id, slot.id)}
                      className="w-full py-2 bg-alabaster-base hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition"
                    >
                      {isBooked ? "إلغاء حجز الموعد" : "تبديل الموعد إلى محجوز"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Patient Roster */}
        {activeTab === "PATIENTS" && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-base text-teal-950">
              {language === "ar" ? "قائمة المرضى والمتابعات الدورية" : "Active Patients Roster"}
            </h3>

            <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100 text-xs">
                {clinicalRecords.map((rec) => (
                  <div key={rec.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-alabaster-base/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                        {rec.patientName[0]}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900">{rec.patientName}</h4>
                        <p className="text-xs text-sage-800 font-semibold">{rec.dsm5Codes[0]}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{rec.chiefComplaint}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Link
                        href={`/session/${rec.appointmentId}`}
                        className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>فتح الغرفة الاستشارية</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SOAP Note & DSM-5 Diagnostic Pad */}
        {activeTab === "SOAP_NOTE" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-alabaster-border shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-800" />
                  <div>
                    <h3 className="font-black text-base text-teal-950">
                      محرر التوثيق السريري المعياري (SOAP Note & DSM-5 Pad)
                    </h3>
                    <p className="text-xs text-gray-500">توثيق معتمد للأعراض السريرية وخطة التدخل وفق معايير نقابة الأطباء.</p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-teal-50 text-teal-900 rounded-full font-bold text-xs border border-teal-200">
                  مريض: سارة محمود (MRN-9482)
                </span>
              </div>

              {/* DSM-5 Selector */}
              <div className="space-y-2">
                <label className="font-bold text-xs text-gray-800 block">التشخيص المعياري (DSM-5 / ICD-11 Classification):</label>
                <select
                  value={selectedDsmDisorder}
                  onChange={(e) => setSelectedDsmDisorder(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-alabaster-base border border-gray-200 text-xs font-bold text-teal-950 focus:outline-none focus:border-teal-700"
                >
                  <option value="300.02 (Generalized Anxiety Disorder)">300.02 - اضطراب القلق المعمم (Generalized Anxiety Disorder)</option>
                  <option value="300.01 (Panic Disorder with Agoraphobia)">300.01 - اضطراب الهلع مع رهاب الساح (Panic Disorder)</option>
                  <option value="296.22 (Major Depressive Disorder, Moderate)">296.22 - اضطراب الاكتئاب الجسيم - متوسط الشدة (Major Depressive Disorder)</option>
                  <option value="309.81 (Post-Traumatic Stress Disorder)">309.81 - اضطراب ما بعد الصدمة (PTSD)</option>
                  <option value="300.3 (Obsessive-Compulsive Disorder)">300.3 - اضطراب الوسواس القهري (OCD)</option>
                </select>
              </div>

              {/* SOAP 4-Quadrant Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                {/* S - Subjective */}
                <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 space-y-2">
                  <div className="flex items-center gap-1.5 font-black text-teal-950">
                    <span className="w-5 h-5 rounded-md bg-teal-800 text-white flex items-center justify-center text-[10px]">S</span>
                    <span>المعطيات الذاتية (Subjective History):</span>
                  </div>
                  <textarea
                    rows={3}
                    value={subjectiveNote}
                    onChange={(e) => setSubjectiveNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-teal-700"
                  />
                  <p className="text-[10px] text-gray-400">شكوى المريض كما ذكرها لفظياً وتاريخ النوبات الأخيرة.</p>
                </div>

                {/* O - Objective */}
                <div className="p-4 bg-sage-50/60 rounded-2xl border border-sage-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-black text-teal-950">
                    <span className="w-5 h-5 rounded-md bg-sage-700 text-white flex items-center justify-center text-[10px]">O</span>
                    <span>الملاحظات الموضوعية وفحص الحالة (Objective / MSE):</span>
                  </div>
                  <textarea
                    rows={3}
                    value={objectiveNote}
                    onChange={(e) => setObjectiveNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-teal-700"
                  />
                  <p className="text-[10px] text-gray-400">فحص الحالة العقلية (MSE)، لغة الجسد، والاستبصار.</p>
                </div>

                {/* A - Assessment */}
                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-black text-amber-950">
                    <span className="w-5 h-5 rounded-md bg-amber-700 text-white flex items-center justify-center text-[10px]">A</span>
                    <span>التقييم الإكلينيكي والصياغة (Assessment & Formulation):</span>
                  </div>
                  <textarea
                    rows={3}
                    value={assessmentNote}
                    onChange={(e) => setAssessmentNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-teal-700"
                  />
                  <p className="text-[10px] text-gray-400">درجات المقاييس التشخيصية ومستوى الخطورة (Risk Level).</p>
                </div>

                {/* P - Plan */}
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-black text-emerald-950">
                    <span className="w-5 h-5 rounded-md bg-emerald-700 text-white flex items-center justify-center text-[10px]">P</span>
                    <span>خطة التدخل والعلاج (Plan & Interventions):</span>
                  </div>
                  <textarea
                    rows={3}
                    value={planNote}
                    onChange={(e) => setPlanNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-teal-700"
                  />
                  <p className="text-[10px] text-gray-400">الجرعات الدوائية، واجبات الـ CBT، وموعد الجلسة القادمة.</p>
                </div>
              </div>

              {soapSaved && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ التوثيق السريري وتوقيعه إلكترونياً وإضافته لملف المريض الطبي بنجاح!</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-[11px] text-gray-400">معتمد ومختوم بتوقيع د. أسماء عبد الوهاب (ترخيص 84920)</span>
                <button
                  onClick={() => {
                    setSoapSaved(true);
                    setTimeout(() => setSoapSaved(false), 3000);
                  }}
                  className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ واعتماد التقرير السريري (SOAP)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Earnings & Payout Analytics */}
        {activeTab === "EARNINGS" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-teal-900 text-white p-6 rounded-3xl shadow-lg space-y-2">
                <span className="text-xs text-teal-200 block">إجمالي الإيرادات السريرية</span>
                <p className="text-3xl font-black">{formatCurrency(currentUser.walletBalanceEGP, "EGP", language)}</p>
                <p className="text-[11px] text-sage-300">نسبة الطبيب 80% وفق العقد المعتمد</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-2">
                <span className="text-xs text-gray-400 block">الجلسات المكتملة</span>
                <p className="text-3xl font-black text-teal-900">42 {language === "ar" ? "جلسة" : "sessions"}</p>
                <p className="text-[11px] text-emerald-600 font-bold">معدل تقييم 4.98 ★</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm flex flex-col justify-center items-center text-center space-y-2">
                <p className="text-xs font-bold text-gray-700">طلب تحويل بنكي للأرباح</p>
                <button
                  onClick={() => {
                    setPayoutRequested(true);
                    setTimeout(() => setPayoutRequested(false), 3000);
                  }}
                  className="px-6 py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold rounded-xl text-xs shadow transition"
                >
                  طلب تحويل بنكي فوري
                </button>
                {payoutRequested && (
                  <p className="text-[10px] text-emerald-600 font-bold">تم إرسال طلب التحويل للإدارة المالية!</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
