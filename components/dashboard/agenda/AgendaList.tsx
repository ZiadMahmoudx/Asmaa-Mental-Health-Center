"use client";

import React, { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileSignature,
  FileText,
  Filter,
  Loader2,
  MessageCircle,
  Phone,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  Video,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type {
  ClinicalRecordView,
  DoctorAgendaEntry,
  IntakeSummaryView,
  SafetyAlertSummary,
} from "@/app/actions/doctor.actions";
import {
  getClinicalRecordForAppointmentAction,
  getPatientActiveSafetyAlertsAction,
  getPatientHistoryAction,
  getPatientIntakeSummaryAction,
  saveClinicalRecordAction,
} from "@/app/actions/doctor.actions";
import {
  getPatientAssessmentsAction,
  type AssessmentHistoryRow,
} from "@/app/actions/assessments.actions";
import {
  getPatientSafetyPlanAction,
  type SafetyPlanView,
} from "@/app/actions/safety-plan.actions";
import { APPOINTMENT_STATUS_LABELS, CSRF_FIELD } from "@/lib/constants";
import { formatCairo, formatEgp } from "@/lib/whatsapp";
import { AppointmentActions } from "./AppointmentActions";
import { PatientDrawer } from "../patient/PatientDrawer";
import { LiveSessionBanner } from "./LiveSessionBanner";

interface Props {
  agenda: DoctorAgendaEntry[];
  csrfToken: string;
  isAdmin?: boolean;
}

export type AgendaFilterType = "TODAY" | "UPCOMING" | "NEEDS_NOTE" | "UNPAID" | "COMPLETED" | "ALL";

interface PatientChartCache {
  assessments: AssessmentHistoryRow[];
  safetyPlan: SafetyPlanView | null;
  history: ClinicalRecordView[];
  alerts: SafetyAlertSummary[];
  intake: IntakeSummaryView | null;
}

export function AgendaList({ agenda, csrfToken, isAdmin = false }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  // Search & Filter state (D4)
  const [filter, setFilter] = useState<AgendaFilterType>("TODAY");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Active drawer & active SOAP note states
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [activePatientName, setActivePatientName] = useState<string>("");
  const [activePatientPhone, setActivePatientPhone] = useState<string>("");
  const [activeAppointmentForNote, setActiveAppointmentForNote] = useState<DoctorAgendaEntry | null>(null);

  // In-memory cache for zero-latency drawer opening (E3)
  const chartCache = useRef<Map<string, PatientChartCache>>(new Map());

  // Loaded existing record for editing (D1)
  const [existingRecord, setExistingRecord] = useState<ClinicalRecordView | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Loaded patient clinical data (D2, D6)
  const [patientAssessments, setPatientAssessments] = useState<AssessmentHistoryRow[]>([]);
  const [patientSafetyPlan, setPatientSafetyPlan] = useState<SafetyPlanView | null>(null);
  const [patientHistory, setPatientHistory] = useState<ClinicalRecordView[]>([]);
  const [patientSafetyAlerts, setPatientSafetyAlerts] = useState<SafetyAlertSummary[]>([]);
  const [patientIntakeSummary, setPatientIntakeSummary] = useState<IntakeSummaryView | null>(null);
  const [isLoadingPatientData, setIsLoadingPatientData] = useState(false);

  // SOAP Note Form state
  const [noteState, noteAction, isNotePending] = useActionState(saveClinicalRecordAction, null);
  const noteFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (noteState?.ok) {
      setActiveAppointmentForNote(null);
      setExistingRecord(null);
      setIsFormDirty(false);
      router.refresh();
    }
  }, [noteState, router]);

  // Auto-scroll into view when note opens (E5)
  useEffect(() => {
    if (activeAppointmentForNote && noteFormRef.current) {
      noteFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeAppointmentForNote]);

  async function openPatientDrawer(appointment: DoctorAgendaEntry) {
    setActivePatientId(appointment.patientId);
    setActivePatientName(appointment.patientName);
    setActivePatientPhone(appointment.patientPhone);

    // Check in-memory cache first for instant opening
    const cached = chartCache.current.get(appointment.patientId);
    if (cached) {
      setPatientAssessments(cached.assessments);
      setPatientSafetyPlan(cached.safetyPlan);
      setPatientHistory(cached.history);
      setPatientSafetyAlerts(cached.alerts);
      setPatientIntakeSummary(cached.intake);
      setIsLoadingPatientData(false);
      return;
    }

    setIsLoadingPatientData(true);

    const [assessmentsRes, safetyPlanRes, historyRes, alertsRes, intakeRes] = await Promise.all([
      getPatientAssessmentsAction(appointment.patientId),
      getPatientSafetyPlanAction(appointment.patientId),
      getPatientHistoryAction(appointment.patientId),
      getPatientActiveSafetyAlertsAction(appointment.patientId),
      getPatientIntakeSummaryAction(appointment.patientId),
    ]);

    const chartData: PatientChartCache = {
      assessments: assessmentsRes.ok ? assessmentsRes.data : [],
      safetyPlan: safetyPlanRes.ok ? safetyPlanRes.data : null,
      history: historyRes.ok ? historyRes.data : [],
      alerts: alertsRes.ok ? alertsRes.data : [],
      intake: intakeRes.ok ? intakeRes.data : null,
    };

    chartCache.current.set(appointment.patientId, chartData);

    setPatientAssessments(chartData.assessments);
    setPatientSafetyPlan(chartData.safetyPlan);
    setPatientHistory(chartData.history);
    setPatientSafetyAlerts(chartData.alerts);
    setPatientIntakeSummary(chartData.intake);
    setIsLoadingPatientData(false);
  }

  async function handleOpenSoapNote(appointment: DoctorAgendaEntry) {
    if (isFormDirty && activeAppointmentForNote) {
      const confirmClose = window.confirm(
        isAr
          ? "لديك تعديلات غير محفوظة في التقرير الطبي الحالي. هل تريد المتابعة وفتح تقرير آخر؟"
          : "You have unsaved changes in the current note. Discard and switch?",
      );
      if (!confirmClose) return;
    }

    setActiveAppointmentForNote(appointment);
    setExistingRecord(null);
    setIsFormDirty(false);

    if (appointment.hasClinicalRecord) {
      setIsLoadingRecord(true);
      const res = await getClinicalRecordForAppointmentAction(appointment.appointmentId);
      if (res.ok && res.data) {
        setExistingRecord(res.data);
      }
      setIsLoadingRecord(false);
    }
  }

  function handleCloseSoapNote() {
    if (isFormDirty) {
      const confirmClose = window.confirm(
        isAr
          ? "لديك تعديلات لم يتم حفظها بعد. هل أنت متأكد من الإغلاق؟"
          : "You have unsaved changes. Are you sure you want to close?",
      );
      if (!confirmClose) return;
    }
    setActiveAppointmentForNote(null);
    setExistingRecord(null);
    setIsFormDirty(false);
  }

  const now = Date.now();
  const startOfTodayMs = new Date().setHours(0, 0, 0, 0);
  const endOfTodayMs = new Date().setHours(23, 59, 59, 999);

  // Compute smart counts for every filter pill (D4)
  const counts = useMemo(() => {
    const today = agenda.filter((it) => {
      const ms = new Date(it.scheduledAtUTC).getTime();
      return ms >= startOfTodayMs && ms <= endOfTodayMs;
    }).length;

    const upcoming = agenda.filter(
      (it) => it.status === "CONFIRMED" && new Date(it.scheduledAtUTC).getTime() >= now,
    ).length;

    const needsNote = agenda.filter(
      (it) =>
        (it.status === "COMPLETED" || (it.status === "CONFIRMED" && new Date(it.scheduledAtUTC).getTime() < now)) &&
        !it.hasClinicalRecord,
    ).length;

    const unpaid = agenda.filter((it) => it.status === "PENDING_PAYMENT_PROOF").length;
    const completed = agenda.filter((it) => it.status === "COMPLETED").length;

    return {
      today,
      upcoming,
      needsNote,
      unpaid,
      completed,
      all: agenda.length,
    };
  }, [agenda, now, startOfTodayMs, endOfTodayMs]);

  // Filtered agenda list
  const filteredAgenda = useMemo(() => {
    return agenda.filter((item) => {
      const itemTime = new Date(item.scheduledAtUTC).getTime();

      // Status filter
      if (filter === "TODAY") {
        if (itemTime < startOfTodayMs || itemTime > endOfTodayMs) return false;
      } else if (filter === "UPCOMING") {
        if (item.status !== "CONFIRMED" || itemTime < now) return false;
      } else if (filter === "NEEDS_NOTE") {
        const isPastSession = item.status === "COMPLETED" || (item.status === "CONFIRMED" && itemTime < now);
        if (!isPastSession || item.hasClinicalRecord) return false;
      } else if (filter === "UNPAID") {
        if (item.status !== "PENDING_PAYMENT_PROOF") return false;
      } else if (filter === "COMPLETED") {
        if (item.status !== "COMPLETED") return false;
      }

      // Patient Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.patientName.toLowerCase().includes(q);
        const matchesPhone = item.patientPhone.includes(q);
        if (!matchesName && !matchesPhone) return false;
      }

      return true;
    });
  }, [agenda, filter, searchQuery, now, startOfTodayMs, endOfTodayMs]);

  return (
    <div className="space-y-6">
      {/* Live / Imminent Session Hero Banner (E1) */}
      <LiveSessionBanner
        agenda={agenda}
        isAr={isAr}
        onOpenSoapNote={handleOpenSoapNote}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main Column: Agenda Controls, List & SOAP Note Form */}
        <div className={`space-y-6 ${activePatientId ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"}`}>
          {/* Smart Filter Pills & Search Bar (D4) */}
          <div className="p-4 bg-white border border-slate-200/90 rounded-3xl shadow-sm space-y-3.5">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter("TODAY")}
                aria-pressed={filter === "TODAY"}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  filter === "TODAY"
                    ? "bg-teal-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{isAr ? "جلسات اليوم" : "Today"}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    filter === "TODAY" ? "bg-teal-950 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {counts.today}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter("UPCOMING")}
                aria-pressed={filter === "UPCOMING"}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  filter === "UPCOMING"
                    ? "bg-teal-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{isAr ? "القادمة والمؤكدة" : "Upcoming"}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    filter === "UPCOMING" ? "bg-teal-950 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {counts.upcoming}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter("NEEDS_NOTE")}
                aria-pressed={filter === "NEEDS_NOTE"}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  filter === "NEEDS_NOTE"
                    ? "bg-orange-700 text-white shadow-sm"
                    : "bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200/80"
                }`}
              >
                <span>{isAr ? "بحاجة لتقرير" : "Needs Note"}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    filter === "NEEDS_NOTE" ? "bg-orange-950 text-white" : "bg-orange-200 text-orange-900"
                  }`}
                >
                  {counts.needsNote}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter("UNPAID")}
                aria-pressed={filter === "UNPAID"}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  filter === "UNPAID"
                    ? "bg-amber-700 text-white shadow-sm"
                    : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/80"
                }`}
              >
                <span>{isAr ? "بانتظار الدفع" : "Unpaid"}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    filter === "UNPAID" ? "bg-amber-950 text-white" : "bg-amber-200 text-amber-950"
                  }`}
                >
                  {counts.unpaid}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter("COMPLETED")}
                aria-pressed={filter === "COMPLETED"}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  filter === "COMPLETED"
                    ? "bg-teal-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{isAr ? "المكتملة" : "Completed"}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    filter === "COMPLETED" ? "bg-teal-950 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {counts.completed}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter("ALL")}
                aria-pressed={filter === "ALL"}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                  filter === "ALL"
                    ? "bg-teal-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span>{isAr ? "جميع الجلسات" : "All"}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    filter === "ALL" ? "bg-teal-950 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {counts.all}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isAr
                    ? "بحث باسم المريض أو رقم الهاتف..."
                    : "Search by patient name or phone number..."
                }
                className="w-full ps-10 pe-10 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-teal-700 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Active SOAP Note Form with Complete Prefill & Unsaved Guard (D1 & E6) */}
          {activeAppointmentForNote && (
            <form
              ref={noteFormRef}
              key={activeAppointmentForNote.appointmentId + (existingRecord ? `-${existingRecord.id}` : "-new")}
              action={noteAction}
              onChange={() => setIsFormDirty(true)}
              className="p-6 bg-white border-2 border-teal-600 rounded-3xl space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150"
            >
              <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
              <input type="hidden" name="appointmentId" value={activeAppointmentForNote.appointmentId} />

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <FileSignature className="w-5 h-5 text-teal-700" />
                      <span>
                        {existingRecord
                          ? isAr ? "تعديل التقرير الإكلينيكي (Clinical SOAP Note)" : "Edit Clinical SOAP Note"
                          : isAr ? "توثيق التقرير الإكلينيكي (Clinical SOAP Note)" : "Clinical SOAP Note Documentation"}
                      </span>
                    </h3>
                    {isLoadingRecord && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-bold">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {isAr ? "جاري تحميل التقرير السابق..." : "Loading previous note..."}
                      </span>
                    )}
                    {existingRecord && !isLoadingRecord && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {isAr ? "تقرير مسجل مسبقاً" : "Existing note loaded"}
                      </span>
                    )}
                    {isFormDirty && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {isAr ? "تعديلات غير محفوظة" : "Unsaved edits"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAr ? "المريض: " : "Patient: "}
                    <strong className="text-slate-800">{activeAppointmentForNote.patientName}</strong> ·{" "}
                    {formatCairo(new Date(activeAppointmentForNote.scheduledAtUTC), isAr ? "ar" : "en")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseSoapNote}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  aria-label={isAr ? "إغلاق" : "Close"}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!noteState?.ok && noteState && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {isAr ? noteState.messageAr : noteState.messageEn ?? noteState.messageAr}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "الشكوى الرئيسية (Chief Complaint)" : "Chief Complaint"}
                </label>
                <textarea
                  name="chiefComplaint"
                  defaultValue={existingRecord?.chiefComplaint ?? ""}
                  rows={2}
                  placeholder={isAr ? "أعراض المريض كما يصفها..." : "Patient symptoms in their own words..."}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? "التشخيص الطبي الإكلينيكي (Diagnosis)" : "Clinical Diagnosis"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="diagnosis"
                    defaultValue={existingRecord?.diagnosis ?? ""}
                    rows={2}
                    required
                    placeholder={isAr ? "التشخيص المعتمد للجلسة..." : "Formal clinical assessment..."}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? "أكواد DSM-5 (مفصولة بفواصل)" : "DSM-5 Diagnostic Codes (Comma-separated)"}
                  </label>
                  <input
                    type="text"
                    name="dsm5Codes"
                    defaultValue={existingRecord?.dsm5Codes ? existingRecord.dsm5Codes.join(", ") : ""}
                    placeholder="F32.1, F41.1, F51.01"
                    dir="ltr"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? "الخطة الدوائية والعلاجية (Plan / Prescription)" : "Treatment & Medication Plan"}
                  </label>
                  <textarea
                    name="prescriptionNotes"
                    defaultValue={existingRecord?.prescriptionNotes ?? ""}
                    rows={3}
                    placeholder={isAr ? "الجرعات والتعليمات..." : "Dosages, titration, instructions..."}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? "توصيات المتابعة (Follow-up)" : "Follow-up & Psychoeducation"}
                  </label>
                  <textarea
                    name="followUpPlan"
                    defaultValue={existingRecord?.followUpPlan ?? ""}
                    rows={3}
                    placeholder={isAr ? "موعد المتابعة، الواجبات السلوكية..." : "Next session timing, behavioural homework..."}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "تقييم درجة الخطورة (Risk Level)" : "Clinical Risk Assessment Level"}
                </label>
                <select
                  name="riskLevel"
                  defaultValue={existingRecord?.riskLevel ?? "LOW"}
                  className="w-full sm:w-1/2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-700"
                >
                  <option value="LOW">{isAr ? "منخفضة (Low)" : "Low"}</option>
                  <option value="MODERATE">{isAr ? "متوسطة (Moderate)" : "Moderate"}</option>
                  <option value="HIGH">{isAr ? "مرتفعة (High)" : "High"}</option>
                  <option value="CRITICAL">{isAr ? "حرجة / طوارئ (Critical)" : "Critical / Crisis"}</option>
                </select>
              </div>

              <label className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  name="sign"
                  value="true"
                  className="rounded border-amber-300 text-teal-600 w-4 h-4"
                />
                <span className="text-xs font-bold text-amber-900">
                  {isAr
                    ? "توقيع التقرير الطبي نهائياً. بعد التوقيع لا يمكن تعديله، ويصبح جزءاً من السجل القانوني للمركز."
                    : "Electronically sign clinical note. Once signed, the record is immutable in the permanent medical registry."}
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseSoapNote}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isNotePending}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
                >
                  {isNotePending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isAr ? "حفظ التقرير الطبي" : "Save Clinical Note"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Agenda List Items */}
          <div className="space-y-4">
            {filteredAgenda.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200/80 rounded-3xl space-y-3">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">
                  {searchQuery
                    ? isAr
                      ? `لا توجد نتائج بحث مطابقة لـ "${searchQuery}".`
                      : `No patient matching "${searchQuery}".`
                    : isAr
                    ? "لا توجد جلسات في هذا الفلتر."
                    : "No sessions under this filter."}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr
                    ? "يمكنك الانتقال لفلتر آخر أو مراجعة جدول المواعيد الأسبوعية."
                    : "Try switching to another filter or reviewing your weekly schedule."}
                </p>
              </div>
            ) : (
              filteredAgenda.map((item) => {
                const statusBadge = APPOINTMENT_STATUS_LABELS[item.status] ?? { ar: item.status, en: item.status };
                const dateObj = new Date(item.scheduledAtUTC);

                return (
                  <div
                    key={item.appointmentId}
                    className={`p-5 bg-white border rounded-3xl space-y-3.5 shadow-sm transition hover:border-teal-600/40 ${
                      item.hasActiveSafetyAlert
                        ? "border-red-300 bg-red-50/10"
                        : "border-slate-200/90"
                    }`}
                  >
                    {/* Top Bar: Patient Details, Badges & Format */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-base">
                            {item.patientName}
                          </span>
                          
                          {/* Format Badge */}
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              item.type === "ONLINE"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {item.type === "ONLINE" ? (
                              <>
                                <Video className="w-3 h-3" />
                                <span>{isAr ? "أونلاين (Zoom)" : "Online (Zoom)"}</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="w-3 h-3" />
                                <span>{isAr ? "بالعيادة" : "In Clinic"}</span>
                              </>
                            )}
                          </span>

                          {/* Active Clinical Safety Alert (D2) */}
                          {item.hasActiveSafetyAlert && (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full border animate-pulse ${
                                item.activeAlertSeverity === "CRISIS"
                                  ? "bg-red-100 text-red-800 border-red-300"
                                  : "bg-amber-100 text-amber-800 border-amber-300"
                              }`}
                            >
                              <ShieldAlert className="w-3 h-3 text-red-600" />
                              <span>
                                {item.activeAlertSeverity === "CRISIS"
                                  ? isAr ? "إنذار طوارئ" : "CRISIS ALERT"
                                  : isAr ? "تنبيه سريري" : "ELEVATED ALERT"}
                              </span>
                            </span>
                          )}

                          {/* Risk Level Badge */}
                          {item.riskLevel && (
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                item.riskLevel === "CRITICAL"
                                  ? "bg-red-600 text-white border-red-700"
                                  : item.riskLevel === "HIGH"
                                  ? "bg-orange-500 text-white border-orange-600"
                                  : item.riskLevel === "MODERATE"
                                  ? "bg-amber-100 text-amber-800 border-amber-300"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-300"
                              }`}
                            >
                              {item.riskLevel}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-mono" dir="ltr">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.patientPhone}
                          </span>
                          <span>·</span>
                          <span className="font-bold text-slate-700">
                            {formatEgp(item.priceEGP, isAr ? "ar" : "en")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.hasClinicalRecord && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                            {item.clinicalRecordSigned ? (
                              <>
                                <FileCheck2 className="w-3 h-3 text-emerald-600" />
                                <span>{isAr ? "تقرير موقّع" : "Signed"}</span>
                              </>
                            ) : (
                              <>
                                <FileSignature className="w-3 h-3 text-amber-600" />
                                <span>{isAr ? "مسودة تقرير" : "Draft Note"}</span>
                              </>
                            )}
                          </span>
                        )}

                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            item.status === "CONFIRMED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : item.status === "COMPLETED"
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : item.status === "CANCELLED"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {isAr ? statusBadge.ar : statusBadge.en}
                        </span>
                      </div>
                    </div>

                    {/* Scheduled Instant & Reschedule trace */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <Clock className="w-4 h-4 text-teal-700" />
                        <span>{formatCairo(dateObj, isAr ? "ar" : "en")}</span>
                        <span className="text-slate-500 font-mono">
                          ({item.durationMinutes} {isAr ? "دقيقة" : "min"})
                        </span>
                      </div>

                      {item.rescheduledFromUTC && (
                        <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold">
                          {isAr ? "معدل من: " : "Rescheduled from: "}
                          {formatCairo(new Date(item.rescheduledFromUTC), isAr ? "ar" : "en")}
                        </span>
                      )}

                      {/* WhatsApp Reminder Link */}
                      {item.status === "CONFIRMED" && (
                        <a
                          href={item.whatsappReminderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{isAr ? "إرسال تذكير بالواتساب" : "Send WhatsApp Reminder"}</span>
                        </a>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                      <AppointmentActions
                        appointment={item}
                        csrfToken={csrfToken}
                        isAdmin={isAdmin}
                        onOpenPatientDrawer={() => openPatientDrawer(item)}
                        onOpenSoapNote={() => handleOpenSoapNote(item)}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Patient Clinical Drawer */}
        {activePatientId && (
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6 h-[calc(100vh-6rem)]">
            {isLoadingPatientData ? (
              <div className="h-full flex items-center justify-center p-8 bg-white rounded-3xl border border-slate-200 shadow-xl">
                <div className="text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-700 mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">
                    {isAr ? "جاري فتح الملف السريري والمقاييس والفرز..." : "Opening patient clinical chart & triage..."}
                  </p>
                </div>
              </div>
            ) : (
              <PatientDrawer
                patientName={activePatientName}
                patientPhone={activePatientPhone}
                assessments={patientAssessments}
                safetyPlan={patientSafetyPlan}
                history={patientHistory}
                safetyAlerts={patientSafetyAlerts}
                intakeSummary={patientIntakeSummary}
                onClose={() => setActivePatientId(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
