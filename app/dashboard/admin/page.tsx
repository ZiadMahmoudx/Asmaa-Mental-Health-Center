"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  Activity,
  Award,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  Lock,
  Stethoscope,
  ChevronRight,
  Download,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { formatCurrency } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { language } = useLanguage();
  const { doctors, appointments, clinicalRecords } = useTelehealth();

  const [activeTab, setActiveTab] = useState<"METRICS" | "DOCTORS" | "FINANCE" | "CRISIS">("METRICS");
  const [approvedPayoutIds, setApprovedPayoutIds] = useState<string[]>([]);

  const togglePayoutApproval = (id: string) => {
    if (approvedPayoutIds.includes(id)) {
      setApprovedPayoutIds(approvedPayoutIds.filter((p) => p !== id));
    } else {
      setApprovedPayoutIds([...approvedPayoutIds, id]);
    }
  };

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Admin Header Banner */}
        <div className="bg-teal-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-800 border border-teal-700 flex items-center justify-center text-sage-300">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">
                  {language === "ar" ? "لوحة الإدارة وضبط الجودة الإكلينيكية" : "Medical Board & QA Dashboard"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-400/30">
                  {language === "ar" ? "صلاحيات الإشراف الطبي" : "Super Admin"}
                </span>
              </div>
              <p className="text-xs text-teal-300">
                {language === "ar" ? "متابعة معايير الجودة الطبية، تراخيص الأطباء، ومؤشرات الأداء" : "Clinical Compliance, Licensure & Metrics Oversight"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-900 rounded-2xl border border-teal-800 text-end">
              <span className="text-[10px] text-teal-300 block">حالة الامتثال للسرية:</span>
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1 justify-end">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% HIPAA & ISO 27001</span>
              </span>
            </div>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-1">
          {[
            { id: "METRICS", labelAr: "المؤشرات الإكلينيكية والتشغيلية", labelEn: "Clinical Metrics", icon: TrendingUp },
            { id: "DOCTORS", labelAr: "اعتماد وتراخيص الاستشاريين", labelEn: "Faculty Credentials", icon: Stethoscope },
            { id: "FINANCE", labelAr: "التقارير المالية والتحويلات", labelEn: "Financial Ledger", icon: DollarSign },
            { id: "CRISIS", labelAr: "سجل حالات الطوارئ والخط الساخن", labelEn: "Crisis Interventions", icon: AlertTriangle },
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

        {/* TAB 1: Clinical & Operational Metrics */}
        {activeTab === "METRICS" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-2">
                <span className="text-xs text-gray-400 font-medium block">إجمالي الجلسات السريرية</span>
                <p className="text-3xl font-black text-teal-950">15,482</p>
                <span className="text-[11px] text-emerald-600 font-bold">+18% هذا الشهر</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-2">
                <span className="text-xs text-gray-400 font-medium block">معدل رضا المرضى السريري</span>
                <p className="text-3xl font-black text-teal-950">4.96 ★</p>
                <span className="text-[11px] text-teal-700 font-bold">بناءً على 4,820 تقييم موثق</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-2">
                <span className="text-xs text-gray-400 font-medium block">الاستشاريون المعتمدون</span>
                <p className="text-3xl font-black text-teal-950">35+</p>
                <span className="text-[11px] text-sage-800 font-bold">بورد مصري وبريطاني</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-2">
                <span className="text-xs text-gray-400 font-medium block">تدخلات الطوارئ الناجحة</span>
                <p className="text-3xl font-black text-red-600">142</p>
                <span className="text-[11px] text-gray-500 font-bold">تحويل فوري لـ 16328</span>
              </div>
            </div>

            {/* Quality Standard Badges */}
            <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-teal-950">معايير الاعتماد والجودة الطبية:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100 flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-teal-700 flex-shrink-0" />
                  <div>
                    <h5 className="font-bold text-teal-950">معيار HIPAA للسرية الطبية</h5>
                    <p className="text-[11px] text-gray-600">تشفير تام لجميع السجلات والبيانات الصحية للمرضى.</p>
                  </div>
                </div>

                <div className="p-4 bg-sage-50 rounded-2xl border border-sage-100 flex items-center gap-3">
                  <Lock className="w-6 h-6 text-sage-700 flex-shrink-0" />
                  <div>
                    <h5 className="font-bold text-sage-950">تشفير الفيديو AES-256 E2EE</h5>
                    <p className="text-[11px] text-gray-600">بث مباشر مشفر بدون تخزين أي تسجيلات على الخوادم.</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                  <Award className="w-6 h-6 text-amber-700 flex-shrink-0" />
                  <div>
                    <h5 className="font-bold text-amber-950">التحقق من التراخيص الطبية</h5>
                    <p className="text-[11px] text-gray-600">فحص دوري لتراخيص وزارة الصحة ونقابة الأطباء.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Doctors & Faculty Credentialing */}
        {activeTab === "DOCTORS" && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-base text-teal-950">قائمة الاستشاريين والتراخيص السارية</h3>
            <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100 text-xs">
                {doctors.map((doc) => (
                  <div key={doc.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-alabaster-base/60">
                    <div className="flex items-center gap-4">
                      <img src={doc.avatar} alt={doc.fullName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-teal-50" />
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900">{doc.fullName}</h4>
                        <p className="text-xs text-sage-800 font-semibold">{doc.title}</p>
                        <p className="text-[11px] text-gray-400 font-mono">رقم الترخيص: {doc.licenseNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-xs border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ترخيص موثق وسارٍ</span>
                      </span>
                      <Link
                        href={`/booking/${doc.id}`}
                        className="px-4 py-2 bg-teal-800 text-white rounded-xl font-bold text-xs hover:bg-teal-900 transition"
                      >
                        معاينة الصفحة
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Financial & Payout Approvals */}
        {activeTab === "FINANCE" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-teal-900 text-white p-6 rounded-3xl shadow-lg space-y-2">
                <span className="text-xs text-teal-200">إجمالي حجم المعاملات (Gross Volume)</span>
                <p className="text-3xl font-black">{formatCurrency(485000, "EGP", language)}</p>
                <span className="text-[11px] text-sage-300">يشمل الجلسات والكورسات والكتب</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-2">
                <span className="text-xs text-gray-400">مستحقات الأطباء المعلقة</span>
                <p className="text-3xl font-black text-teal-900">{formatCurrency(28400, "EGP", language)}</p>
                <span className="text-[11px] text-amber-600 font-bold">1 طلب تحويل قيد المراجعة</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-2">
                <span className="text-xs text-gray-400">إيرادات المنصة الصافية</span>
                <p className="text-3xl font-black text-emerald-700">{formatCurrency(97000, "EGP", language)}</p>
                <span className="text-[11px] text-emerald-600 font-bold">20% عمولة تشغيل وتقنية</span>
              </div>
            </div>

            {/* Payout Approval Table */}
            <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-4">
              <h4 className="font-extrabold text-sm text-teal-950">طلبات تحويل الأرباح للمراجعة والاعتماد:</h4>
              <div className="p-4 bg-alabaster-base rounded-2xl border border-alabaster-border flex items-center justify-between text-xs">
                <div>
                  <h5 className="font-bold text-gray-900">د. أسماء عبد الوهاب (استشاري أول)</h5>
                  <p className="text-gray-500">المبلغ المطلوب: 28,400 ج.م • تحويل بنكي (CIB)</p>
                </div>
                <button
                  onClick={() => togglePayoutApproval("po-1")}
                  className={`px-5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                    approvedPayoutIds.includes("po-1")
                      ? "bg-emerald-600 text-white"
                      : "bg-teal-800 hover:bg-teal-900 text-white"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{approvedPayoutIds.includes("po-1") ? "تم اعتماد التحويل" : "اعتماد التحويل المالي"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Crisis Log */}
        {activeTab === "CRISIS" && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-base text-teal-950">سجل تدخلات الطوارئ والتوجيه للخط الساخن 16328</h3>
            <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-3 text-xs">
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-red-950 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">حالة ضيق حاد تم اعتراضها عبر المساعد الذكي</h5>
                    <p className="text-[11px] text-red-800 mt-0.5">تم تفعيل نافذة الطوارئ الفورية وتوجيه المريض للخط الساخن 16328 مع عرض تمارين التهدئة.</p>
                    <span className="text-[10px] text-gray-500 mt-1 block">التوقيت: اليوم، 14:10 • الإجراء: تدخل فوري وتوجيه</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-red-100 text-red-900 rounded-lg font-bold text-[10px]">مكتمل بنجاح</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
