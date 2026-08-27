"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  Wallet,
  FileText,
  BookOpen,
  Play,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Download,
  Printer,
  X,
  CheckCircle2,
  Stethoscope,
  Smile,
  Meh,
  Frown,
  Brain,
  Sparkles,
  Zap,
  Activity,
  Send,
  TrendingDown,
  LineChart,
  Award,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ClinicalSessionRecord, MoodLogEntry, CBTThoughtRecord } from "@/types/telehealth";

export default function PatientDashboardPage() {
  const { language } = useLanguage();
  const {
    currentUser,
    appointments,
    clinicalRecords,
    courses,
    books,
    enrolledCourseIds,
    purchasedBookIds,
    walletTransactions,
    topUpWallet,
    cancelAppointment,
  } = useTelehealth();

  const [activeTab, setActiveTab] = useState<"APPOINTMENTS" | "WALLET" | "RECORDS" | "TOOLKIT" | "PROGRESS" | "LIBRARY">("APPOINTMENTS");
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(500);
  const [topUpMethod, setTopUpMethod] = useState("InstaPay");
  const [viewingRecord, setViewingRecord] = useState<ClinicalSessionRecord | null>(null);

  // Mood Tracker State
  const [selectedMoodScore, setSelectedMoodScore] = useState<number>(7);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(["أمل", "امتنان"]);
  const [moodNotes, setMoodNotes] = useState("");
  const [moodLogs, setMoodLogs] = useState<MoodLogEntry[]>([
    {
      id: "ml-1",
      patientId: "pat-1",
      moodScore: 8,
      moodLabel: "مبتهج ومطمئن",
      moodEmoji: "😊",
      emotions: ["امتنان", "هدوء"],
      energyLevel: "HIGH",
      sleepHours: 7.5,
      notes: "تمارين التنفس ساعدتني جداً على النوم العميق.",
      timestamp: "اليوم، 10:30 صباحاً",
    },
    {
      id: "ml-2",
      patientId: "pat-1",
      moodScore: 5,
      moodLabel: "توتر خفيف",
      moodEmoji: "😐",
      emotions: ["قلق", "إرهاق"],
      energyLevel: "MEDIUM",
      sleepHours: 6,
      notes: "ضغط عمل في الصباح ولكن طبقت تمرين 4-7-8.",
      timestamp: "أمس، 8:15 مساءً",
    },
  ]);

  // CBT Journal State
  const [cbtRecords, setCbtRecords] = useState<CBTThoughtRecord[]>([
    {
      id: "cbt-1",
      patientId: "pat-1",
      situation: "تأخر الرد على إيميل عمل مهم من المدير",
      automaticThought: "بالتأكيد غير راضٍ عن أدائي وسيقوم بإنهاء خدماتي",
      distortionType: "التفكير الكارثي وقراءة الأفكار (Catastrophizing & Mind Reading)",
      distortionTypeEn: "Catastrophizing",
      rationalResponse: "تأخر الرد قد يعني انشغاله باجتماعات أخرى، وأدائي في آخر تقييم كان ممتازاً.",
      outcomeEmotion: "هدوء وتراجع القلق من 9/10 إلى 3/10",
      reRating: 3,
      createdAt: "2026-08-25",
    },
  ]);
  const [newSituation, setNewSituation] = useState("");
  const [newAutoThought, setNewAutoThought] = useState("");
  const [newDistortion, setNewDistortion] = useState("التفكير الكارثي (Catastrophizing)");
  const [newRational, setNewRational] = useState("");
  const [showCbtSuccess, setShowCbtSuccess] = useState(false);

  const activeAppointments = appointments.filter((a) => a.status === "CONFIRMED");

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    topUpWallet(topUpAmount, "EGP", topUpMethod);
    setShowTopUpModal(false);
  };

  const handleSaveMood = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: MoodLogEntry = {
      id: `ml-${Date.now()}`,
      patientId: currentUser.id,
      moodScore: selectedMoodScore,
      moodLabel: selectedMoodScore >= 7 ? "مطمئن ومتحسن" : selectedMoodScore >= 5 ? "متوسط" : "قلق ومجهد",
      moodEmoji: selectedMoodScore >= 7 ? "😊" : selectedMoodScore >= 5 ? "😐" : "😔",
      emotions: selectedEmotions,
      energyLevel: "MEDIUM",
      sleepHours: 7,
      notes: moodNotes,
      timestamp: "الآن",
    };
    setMoodLogs([newEntry, ...moodLogs]);
    setMoodNotes("");
  };

  const handleAddCBT = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSituation.trim() || !newAutoThought.trim()) return;

    const newRecord: CBTThoughtRecord = {
      id: `cbt-${Date.now()}`,
      patientId: currentUser.id,
      situation: newSituation.trim(),
      automaticThought: newAutoThought.trim(),
      distortionType: newDistortion,
      distortionTypeEn: "Cognitive Distortion",
      rationalResponse: newRational.trim() || "إعادة صياغة عقلانية متزنة",
      outcomeEmotion: "تراجع حدة التوتر وزيادة الاستبصار",
      reRating: 4,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setCbtRecords([newRecord, ...cbtRecords]);
    setNewSituation("");
    setNewAutoThought("");
    setNewRational("");
    setShowCbtSuccess(true);
    setTimeout(() => setShowCbtSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Patient Profile Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-alabaster-border shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-teal-100 shadow-sm"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-teal-950">
                  {language === "ar" ? currentUser.name : currentUser.nameEn}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200">
                  {language === "ar" ? "ملف مريض نشط" : "Active Patient"}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono">
                {language === "ar" ? "الرقم الطبي الموحد:" : "Medical Record #:"} {currentUser.medicalRecordNumber}
              </p>
            </div>
          </div>

          {/* Quick Wallet Balance Pill */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
            <div className="text-start md:text-end">
              <span className="text-[11px] text-gray-400 block font-medium">
                {language === "ar" ? "رصيد محفظتك المتاح:" : "Wallet Balance:"}
              </span>
              <span className="text-xl font-black text-teal-900">
                {formatCurrency(currentUser.walletBalanceEGP, "EGP", language)}
              </span>
            </div>
            <button
              onClick={() => setShowTopUpModal(true)}
              className="px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "شحن رصيد" : "Top Up"}</span>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-1">
          {[
            { id: "APPOINTMENTS", labelAr: "الجلسات القادمة", labelEn: "Upcoming Sessions", icon: Calendar },
            { id: "WALLET", labelAr: "المحفظة والعمليات", labelEn: "Wallet & Ledger", icon: Wallet },
            { id: "RECORDS", labelAr: "السجل الطبي والروشتات", labelEn: "E-Prescriptions", icon: FileText },
            { id: "TOOLKIT", labelAr: "مقياس المزاج وتمارين CBT", labelEn: "Mood & CBT Toolkit", icon: Brain },
            { id: "PROGRESS", labelAr: "مؤشرات التحسن والتعافي", labelEn: "Clinical Progress", icon: LineChart },
            { id: "LIBRARY", labelAr: "مكتبتي الرقمية والكورسات", labelEn: "My Library", icon: BookOpen },
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

        {/* TAB 1: Upcoming Appointments */}
        {activeTab === "APPOINTMENTS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-teal-950">
                {language === "ar" ? "الجلسات الاستشارية المجدولة" : "Scheduled Telehealth Consultations"}
              </h3>
              <Link
                href="/therapists"
                className="text-xs font-bold text-teal-800 hover:underline"
              >
                {language === "ar" ? "+ حجز موعد جديد" : "+ Book New Session"}
              </Link>
            </div>

            {activeAppointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-4 relative overflow-hidden"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={apt.doctorAvatar}
                        alt={apt.doctorName}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-teal-50"
                      />
                      <div className="space-y-1 flex-1">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 inline-block">
                          {language === "ar" ? "مؤكدة وجاهزة" : "Confirmed"}
                        </span>
                        <h4 className="font-extrabold text-sm text-gray-900">{apt.doctorName}</h4>
                        <p className="text-xs text-sage-700 font-semibold">{apt.doctorTitle}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-alabaster-base rounded-2xl border border-alabaster-border space-y-1.5 text-xs text-gray-700">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-sage-700" />
                        <span className="font-bold">{formatDateTime(apt.scheduledAtUTC, language)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200/60">
                        <span>المدة: {apt.durationMinutes} دقيقة</span>
                        <span>المدفوع: {formatCurrency(apt.pricePaid, "EGP", language)}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <Link
                        href={`/session/${apt.videoRoomId}`}
                        className="flex-1 py-3 bg-teal-800 hover:bg-teal-900 text-white rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                      >
                        <Video className="w-4 h-4 text-emerald-300" />
                        <span>{language === "ar" ? "الانضمام للجلسة الآن" : "Join Session Now"}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => cancelAppointment(apt.id)}
                        className="px-3.5 py-3 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-2xl font-bold text-xs transition"
                      >
                        {language === "ar" ? "إلغاء واسترداد" : "Cancel"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-alabaster-border space-y-3">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
                <h4 className="font-bold text-gray-700 text-sm">
                  {language === "ar" ? "لا توجد جلسات قادمة مجدولة حالياً" : "No upcoming sessions"}
                </h4>
                <Link
                  href="/therapists"
                  className="inline-block px-6 py-2.5 bg-teal-800 text-white rounded-xl font-bold text-xs shadow"
                >
                  {language === "ar" ? "احجز جلستك الأولى الآن" : "Book Your First Session"}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Digital Wallet */}
        {activeTab === "WALLET" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-teal-900 text-white p-6 rounded-3xl shadow-lg space-y-2">
                <span className="text-xs text-teal-200 font-medium block">الرصيد الكلي المتاح</span>
                <p className="text-2xl font-black">{formatCurrency(currentUser.walletBalanceEGP, "EGP", language)}</p>
                <p className="text-[11px] text-sage-300">يستخدم للدفع الفوري وحجز الجلسات والكورسات</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-2">
                <span className="text-xs text-gray-400 font-medium block">إجمالي الاستردادات</span>
                <p className="text-2xl font-black text-teal-900">{formatCurrency(0, "EGP", language)}</p>
                <p className="text-[11px] text-gray-500">استرداد فوري إلى محفظتك في حال الإلغاء</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm flex flex-col justify-center items-center text-center space-y-2">
                <p className="text-xs font-bold text-gray-700">شحن الرصيد الفوري</p>
                <button
                  onClick={() => setShowTopUpModal(true)}
                  className="px-6 py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  + شحن عبر InstaPay أو البطاقة
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-extrabold text-sm text-teal-950">سجل الحركات المالية والمصروفات</h3>
              </div>
              <div className="divide-y divide-gray-100 text-xs">
                {walletTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-alabaster-base/60 transition">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${tx.amount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                        {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{tx.description}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{tx.referenceNumber} • {new Date(tx.date).toLocaleDateString("ar-EG")}</p>
                      </div>
                    </div>
                    <span className={`font-black text-sm ${tx.amount > 0 ? "text-emerald-700" : "text-gray-900"}`}>
                      {tx.amount > 0 ? `+${formatCurrency(tx.amount, tx.currency, language)}` : formatCurrency(tx.amount, tx.currency, language)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Clinical Records */}
        {activeTab === "RECORDS" && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-base text-teal-950">الروشتات والتقارير الطبية المعتمدة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {clinicalRecords.map((rec) => (
                <div key={rec.id} className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-4">
                  <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-teal-50 rounded-xl text-teal-800">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900">{rec.doctorName}</h4>
                        <p className="text-[11px] text-gray-400">{rec.sessionDate}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      معتمدة رسمياً
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-700">
                    <div>
                      <span className="font-bold text-gray-900 block">التشخيص:</span>
                      <p className="text-gray-600 line-clamp-2">{rec.clinicalDiagnosisNotes}</p>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <span className="font-bold text-gray-900 block mb-1">الأدوية الموصوفة ({rec.prescription.length}):</span>
                      <div className="space-y-1">
                        {rec.prescription.map((rx) => (
                          <div key={rx.id} className="p-2 bg-alabaster-base rounded-xl text-[11px] font-medium text-teal-950">
                            • {rx.medicineName} ({rx.dosage})
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingRecord(rec)}
                    className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>عرض وطباعة الروشتة المعتمدة</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Mood Tracker & CBT Toolkit */}
        {activeTab === "TOOLKIT" && (
          <div className="space-y-8">
            {/* 1. Daily Mood Logger */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-alabaster-border shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-teal-50 rounded-xl text-teal-800">
                    <Smile className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-teal-950">مقياس المزاج والمشاعر اليومي</h3>
                    <p className="text-xs text-gray-500">سجل حالتك الشعورية يومياً لمتابعة مسار تحسنك السريري.</p>
                  </div>
                </div>
                <Link href="/assessments" className="text-xs font-bold text-teal-800 hover:underline">
                  + بطارية المقاييس السريرية (PHQ-9/GAD-7)
                </Link>
              </div>

              {/* Mood Slider & Emojis */}
              <form onSubmit={handleSaveMood} className="space-y-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-gray-700">
                    <span>مستوى المزاج (1 إلى 10):</span>
                    <span className="text-teal-900 font-extrabold text-sm">{selectedMoodScore} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={selectedMoodScore}
                    onChange={(e) => setSelectedMoodScore(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-800"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>1 (ضيق شديد)</span>
                    <span>5 (محايد)</span>
                    <span>10 (استقرار وسلام)</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">ملاحظاتك ومحفزات اليوم:</label>
                  <input
                    type="text"
                    value={moodNotes}
                    onChange={(e) => setMoodNotes(e.target.value)}
                    placeholder="ما الذي أثر على مزاجك اليوم؟ (مثال: مارست رياضة المشي وشعرت بارتياح)"
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-teal-700"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-xs shadow transition"
                >
                  حفظ في سجلي اليومي
                </button>
              </form>

              {/* Recent Mood Logs */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <h4 className="font-bold text-xs text-gray-700">سجل المشاعر الأخير:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {moodLogs.map((ml) => (
                    <div key={ml.id} className="p-3.5 bg-alabaster-base rounded-2xl border border-alabaster-border text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5 text-teal-950">
                          <span>{ml.moodEmoji}</span>
                          <span>{ml.moodLabel} ({ml.moodScore}/10)</span>
                        </span>
                        <span className="text-[10px] text-gray-400">{ml.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-gray-600">{ml.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 1.5 Therapeutic Homework & Safety Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Safety Plan Link Card */}
              <div className="bg-gradient-to-br from-red-50 to-white rounded-3xl p-6 border border-red-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-red-900">
                  <span className="p-2 bg-red-100 rounded-xl">
                    <ShieldAlert className="w-5 h-5 text-red-700" />
                  </span>
                  <div>
                    <h4 className="font-black text-sm text-red-950">خطة الأمان النفسي الشخصية (SPI)</h4>
                    <p className="text-[11px] text-red-800">بروتوكول التعامل مع لحظات الضيق الحاد والطوارئ</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  خطة معتمدة تحتوي على محفزاتك، جهات اتصالك المقربة، والخطوات التدريجية لتأمين سلامتك.
                </p>
                <Link
                  href="/safety-plan"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow transition"
                >
                  <span>عرض وتعديل خطة الأمان</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </Link>
              </div>

              {/* Therapy Homework Card */}
              <div className="bg-white rounded-3xl p-6 border border-alabaster-border shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="font-extrabold text-xs text-teal-950">التكليفات العلاجية الموكلة من الاستشاري:</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage-50 text-sage-800 font-bold border border-sage-200">
                    2 من 3 مكتملة
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-alabaster-base rounded-xl cursor-pointer hover:bg-teal-50/50 transition">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-teal-800 rounded" />
                    <span className="text-gray-700 line-through">إتمام 3 تسجيلات في مقياس المزاج الأسبوعي</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-alabaster-base rounded-xl cursor-pointer hover:bg-teal-50/50 transition">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-teal-800 rounded" />
                    <span className="text-gray-700 line-through">ممارسة تمرين 4-7-8 مرتين يومياً قبل النوم</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-teal-50/80 rounded-xl cursor-pointer border border-teal-200 font-bold text-teal-950">
                    <input type="checkbox" className="w-4 h-4 accent-teal-800 rounded" />
                    <span>تسجيل فكرة كارثية وإعادة صياغتها في جدول الـ CBT</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 2. CBT Thought Restructuring Journal */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-alabaster-border shadow-md space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="p-2 bg-sage-50 rounded-xl text-sage-800">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-teal-950">سجل الأفكار التلقائية وإعادة الصياغة المعرفية (CBT)</h3>
                  <p className="text-xs text-gray-500">أداة سريرية لتفكيك التشوهات المعرفية (Cognitive Distortions) وبناء استجابات متزنة.</p>
                </div>
              </div>

              {/* Add New CBT Record */}
              <form onSubmit={handleAddCBT} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">الموقف المثير للتوتر (Situation):</label>
                    <input
                      type="text"
                      value={newSituation}
                      onChange={(e) => setNewSituation(e.target.value)}
                      placeholder="ما الذي حدث بالضبط؟"
                      className="w-full p-2.5 rounded-xl border border-gray-200 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">الفكرة التلقائية السلبية (Automatic Thought):</label>
                    <input
                      type="text"
                      value={newAutoThought}
                      onChange={(e) => setNewAutoThought(e.target.value)}
                      placeholder="ما الفكرة الكارثية التي قفزت لذهنك؟"
                      className="w-full p-2.5 rounded-xl border border-gray-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">نوع التشوه المعرفي (Distortion):</label>
                    <select
                      value={newDistortion}
                      onChange={(e) => setNewDistortion(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-medium"
                    >
                      <option value="التفكير الكارثي (Catastrophizing)">التفكير الكارثي (Catastrophizing)</option>
                      <option value="قراءة الأفكار (Mind Reading)">قراءة أفكار الآخرين (Mind Reading)</option>
                      <option value="الكل أو لا شيء (All-or-Nothing)">أبيض أو أسود (All-or-Nothing)</option>
                      <option value="التعميم الزائد (Overgeneralization)">التعميم الزائد (Overgeneralization)</option>
                      <option value="عبارات الإلزام (Should Statements)">عبارات الإلزام الصارمة (Should Statements)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">الاستجابة العقلانية البديلة (Rational Response):</label>
                    <input
                      type="text"
                      value={newRational}
                      onChange={(e) => setNewRational(e.target.value)}
                      placeholder="ما هو الدليل الواقعي؟ وما البديل المنطقي؟"
                      className="w-full p-2.5 rounded-xl border border-gray-200 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تفكيك الفكرة وحفظ السجل</span>
                </button>
              </form>

              {showCbtSuccess && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ تمرين إعادة الصياغة بنجاح! أحسنت في تحدي أفكارك.</span>
                </div>
              )}

              {/* CBT Saved Records */}
              <div className="space-y-3 pt-2">
                {cbtRecords.map((rec) => (
                  <div key={rec.id} className="p-4 bg-alabaster-base rounded-2xl border border-alabaster-border space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-teal-950 border-b border-gray-200 pb-1.5">
                      <span>الموقف: {rec.situation}</span>
                      <span className="text-[10px] text-gray-400">{rec.createdAt}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 bg-red-50/70 rounded-xl border border-red-100 text-red-950">
                        <span className="font-bold block text-red-800">الفكرة السلبية: </span>
                        <span>{rec.automaticThought}</span>
                        <span className="block text-[10px] text-red-700 mt-0.5">({rec.distortionType})</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 text-emerald-950">
                        <span className="font-bold block text-emerald-800">الصياغة العقلانية: </span>
                        <span>{rec.rationalResponse}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Clinical Symptom Progress & Relapse Prevention */}
        {activeTab === "PROGRESS" && (
          <div className="space-y-8">
            {/* Header Metrics Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-teal-900 to-teal-950 text-white p-6 rounded-3xl shadow-lg space-y-2">
                <div className="flex items-center justify-between text-teal-200 text-xs">
                  <span>معدل التراجع السريري للأعراض</span>
                  <Award className="w-4 h-4 text-amber-300" />
                </div>
                <p className="text-3xl font-black text-emerald-300">78% ↓</p>
                <p className="text-[11px] text-sage-200">تحسن ملحوظ واستقرار الحالة المزاجية</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-2">
                <div className="flex items-center justify-between text-gray-500 text-xs font-bold">
                  <span>مقياس الاكتئاب (PHQ-9)</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">طبيعي (Minimal)</span>
                </div>
                <p className="text-3xl font-black text-teal-950">4 <span className="text-xs text-gray-400 font-normal">/ 27 (كان 19)</span></p>
                <p className="text-[11px] text-gray-500">تراجع من اكتئاب متوسط الشدة إلى الحد الأدنى</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-2">
                <div className="flex items-center justify-between text-gray-500 text-xs font-bold">
                  <span>مقياس القلق (GAD-7)</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">طبيعي (Minimal)</span>
                </div>
                <p className="text-3xl font-black text-teal-950">3 <span className="text-xs text-gray-400 font-normal">/ 21 (كان 17)</span></p>
                <p className="text-[11px] text-gray-500">تراجع نوبات الهلع والقلق المعمم بنجاح</p>
              </div>
            </div>

            {/* Longitudinal Trend Chart */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-alabaster-border shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-teal-800" />
                  <div>
                    <h3 className="font-black text-base text-teal-950">منحنى التطور والتعافي عبر الجلسات (Longitudinal Progress)</h3>
                    <p className="text-xs text-gray-500">تتبع درجات المقاييس التشخيصية منذ بداية الخطة العلاجية وحتى اليوم.</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-teal-50 text-teal-900 rounded-full font-bold text-xs border border-teal-200">
                  مرحلة التعافي والوقاية من الانتكاس
                </span>
              </div>

              {/* Progress Stepper Bars */}
              <div className="space-y-4">
                {[
                  { stage: "الجلسة 1 (التقييم المبدئي - الأسبوع 1)", phq: 19, gad: 17, date: "15 يناير 2026", status: "أعراض حادة" },
                  { stage: "الجلسة 3 (بداية العلاج المعرفي - الأسبوع 3)", phq: 14, gad: 12, date: "29 يناير 2026", status: "تحسن أولي" },
                  { stage: "الجلسة 6 (تمارين إعادة الهيكلة - الأسبوع 6)", phq: 8, gad: 6, date: "12 فبراير 2026", status: "أعراض خفيفة" },
                  { stage: "الجلسة 8 (التقييم الحالي - مرحلة الصيانة)", phq: 4, gad: 3, date: "26 فبراير 2026", status: "استقرار تام" },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-alabaster-base rounded-2xl border border-alabaster-border space-y-2">
                    <div className="flex items-center justify-between font-bold text-xs text-teal-950">
                      <span>{item.stage}</span>
                      <span className="text-[11px] text-gray-400">{item.date}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                          <span>PHQ-9 (الاكتئاب):</span>
                          <span className="font-bold">{item.phq}/27</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.phq > 12 ? "bg-amber-500" : item.phq > 6 ? "bg-teal-600" : "bg-emerald-500"
                            }`}
                            style={{ width: `${(item.phq / 27) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                          <span>GAD-7 (القلق):</span>
                          <span className="font-bold">{item.gad}/21</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.gad > 10 ? "bg-amber-500" : item.gad > 5 ? "bg-teal-600" : "bg-emerald-500"
                            }`}
                            style={{ width: `${(item.gad / 21) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Relapse Prevention Protocol */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-alabaster-border shadow-md space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-teal-950">بروتوكول الوقاية من الانتكاس (Relapse Prevention Plan)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-1">
                  <h4 className="font-bold text-emerald-950">عوامل الحماية النشطة (Protective Factors):</h4>
                  <ul className="space-y-1 text-emerald-800 list-disc list-inside text-[11px]">
                    <li>الالتزام بروتين النوم الصحي (7-8 ساعات يومياً).</li>
                    <li>الممارسة المنتظمة لتمارين التنفس والـ CBT.</li>
                    <li>جلسة متابعة شهرية دورية مع د. أسماء.</li>
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-100 space-y-1">
                  <h4 className="font-bold text-amber-950">إجراءات الإنذار المبكر:</h4>
                  <ul className="space-y-1 text-amber-800 list-disc list-inside text-[11px]">
                    <li>عند ملاحظة اضطراب النوم لأكثر من يومين متتاليين.</li>
                    <li>تفعيل خطة الأمان النفسي الشخصية فوراً.</li>
                    <li>حجز جلسة دعم سريعة أو التواصل عبر شات المنصة.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Digital Library */}
        {activeTab === "LIBRARY" && (
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-teal-950">الكورسات والماستركلاس المشترك بها</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {courses.filter((c) => enrolledCourseIds.includes(c.id)).map((course) => (
                  <div key={course.id} className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-5 space-y-4">
                    <div className="relative h-44 rounded-2xl overflow-hidden bg-gray-100">
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <button className="w-12 h-12 bg-white/90 text-teal-900 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition">
                          <Play className="w-5 h-5 fill-teal-900" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900">{course.title}</h4>
                      <p className="text-xs text-sage-700 font-semibold">{course.instructorName}</p>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-400">{course.modules.length} وحدات تدريبية</span>
                      <Link href="/academy" className="font-bold text-terracotta-600 hover:underline">
                        متابعة المشاهدة
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-extrabold text-base text-teal-950">الكتب الإلكترونية المشتراة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {books.filter((b) => purchasedBookIds.includes(b.id)).map((book) => (
                  <div key={book.id} className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-5 space-y-3 text-center">
                    <img src={book.coverImage} alt={book.title} className="w-32 h-44 object-cover mx-auto rounded-2xl shadow-md" />
                    <h4 className="font-extrabold text-xs text-gray-900 line-clamp-1">{book.title}</h4>
                    <p className="text-[11px] text-gray-500">{book.author}</p>
                    <Link
                      href="/books"
                      className="block w-full py-2 bg-teal-50 text-teal-800 font-bold text-xs rounded-xl hover:bg-teal-100 transition"
                    >
                      فتح قارئ الكتاب
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top Up Modal */}
        {showTopUpModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setShowTopUpModal(false)} className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-lg text-teal-950 mb-4">شحن رصيد المحفظة الفوري</h3>
              <form onSubmit={handleTopUpSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">المبلغ المراد شحنه (جنيه مصري):</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[300, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTopUpAmount(amt)}
                        className={`p-2.5 rounded-xl border font-bold transition ${
                          topUpAmount === amt ? "bg-teal-800 text-white border-teal-800" : "bg-white text-gray-700 border-gray-200"
                        }`}
                      >
                        {amt} ج.م
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold text-teal-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">طريقة الإيداع:</label>
                  <select
                    value={topUpMethod}
                    onChange={(e) => setTopUpMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                  >
                    <option value="InstaPay">InstaPay (فوري وبدون رسوم)</option>
                    <option value="Vodafone Cash">محافظ الهاتف (Vodafone/Orange Cash)</option>
                    <option value="Credit Card">بطاقة بنكية (Debit/Credit Card)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold rounded-2xl shadow-md transition"
                >
                  تأكيد شحن {topUpAmount} ج.م
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Printable Prescription Modal */}
        {viewingRecord && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-teal-100 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setViewingRecord(null)} className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
              <div className="text-center pb-6 border-b-2 border-teal-900 space-y-1">
                <h3 className="font-black text-xl text-teal-950">مركز أسما للصحة النفسية وعلاج الإدمان</h3>
                <p className="text-xs text-sage-800 font-bold">ASMAA MENTAL HEALTH CLINIC • E-PRESCRIPTION</p>
                <p className="text-[10px] text-gray-400 font-mono">ترخيص وزارة الصحة: 84920/2020</p>
              </div>
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-200 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">اسم المريض:</span>
                  <span className="font-bold text-gray-900">{viewingRecord.patientName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">التاريخ:</span>
                  <span className="font-bold text-gray-900">{viewingRecord.sessionDate}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">الاستشاري المعالج:</span>
                  <span className="font-bold text-teal-900">{viewingRecord.doctorName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">التشخيص:</span>
                  <span className="font-bold text-gray-800">{viewingRecord.dsm5Codes[0]}</span>
                </div>
              </div>
              <div className="py-6 space-y-4">
                <span className="text-3xl font-black text-teal-900 font-serif">℞</span>
                <div className="space-y-3">
                  {viewingRecord.prescription.map((item, idx) => (
                    <div key={item.id} className="p-3.5 bg-alabaster-base rounded-2xl border border-alabaster-border text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-teal-950">
                        <span>{idx + 1}. {item.medicineName}</span>
                        <span className="text-[11px] text-sage-800">{item.frequency}</span>
                      </div>
                      <p className="text-[11px] text-gray-600">الجرعة: {item.dosage} • المدة: {item.duration}</p>
                      <p className="text-[10px] text-gray-500">تعليمات: {item.instructions}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-6 border-t border-gray-200 flex items-center justify-between text-xs">
                <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200 text-[10px] text-teal-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-700 flex-shrink-0" />
                  <span>توقيع إلكتروني مؤمن ومرخص من نقابة أطباء مصر</span>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الروشتة</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
