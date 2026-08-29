"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileSignature,
  Loader2,
  MessageCircle,
  Phone,
  ShieldAlert,
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

interface Props {
  agenda: DoctorAgendaEntry[];
  csrfToken: string;
  isAdmin?: boolean;
}

export function AgendaList({ agenda, csrfToken, isAdmin = false }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  // Active drawer & active SOAP note states
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [activePatientName, setActivePatientName] = useState<string>("");
  const [activePatientPhone, setActivePatientPhone] = useState<string>("");
  const [activeAppointmentForNote, setActiveAppointmentForNote] = useState<DoctorAgendaEntry | null>(null);

  // Loaded existing record for editing (D1)
  const [existingRecord, setExistingRecord] = useState<ClinicalRecordView | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);

  // Loaded patient clinical data (D2, D6)
  const [patientAssessments, setPatientAssessments] = useState<AssessmentHistoryRow[]>([]);
  const [patientSafetyPlan, setPatientSafetyPlan] = useState<SafetyPlanView | null>(null);
  const [patientHistory, setPatientHistory] = useState<ClinicalRecordView[]>([]);
  const [patientSafetyAlerts, setPatientSafetyAlerts] = useState<SafetyAlertSummary[]>([]);
  const [patientIntakeSummary, setPatientIntakeSummary] = useState<IntakeSummaryView | null>(null);
  const [isLoadingPatientData, setIsLoadingPatientData] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UPCOMING" | "COMPLETED">("ALL");

  // SOAP Note Form state
  const [noteState, noteAction, isNotePending] = useActionState(saveClinicalRecordAction, null);

  useEffect(() => {
    if (noteState?.ok) {
      setActiveAppointmentForNote(null);
      setExistingRecord(null);
      router.refresh();
    }
  }, [noteState, router]);

  async function openPatientDrawer(appointment: DoctorAgendaEntry) {
    setActivePatientId(appointment.patientId);
    setActivePatientName(appointment.patientName);
    setActivePatientPhone(appointment.patientPhone);
    setIsLoadingPatientData(true);

    const [assessmentsRes, safetyPlanRes, historyRes, alertsRes, intakeRes] = await Promise.all([
      getPatientAssessmentsAction(appointment.patientId),
      getPatientSafetyPlanAction(appointment.patientId),
      getPatientHistoryAction(appointment.patientId),
      getPatientActiveSafetyAlertsAction(appointment.patientId),
      getPatientIntakeSummaryAction(appointment.patientId),
    ]);

    setIsLoadingPatientData(false);

    if (assessmentsRes.ok) setPatientAssessments(assessmentsRes.data);
    else setPatientAssessments([]);

    if (safetyPlanRes.ok) setPatientSafetyPlan(safetyPlanRes.data);
    else setPatientSafetyPlan(null);

    if (historyRes.ok) setPatientHistory(historyRes.data);
    else setPatientHistory([]);

    if (alertsRes.ok) setPatientSafetyAlerts(alertsRes.data);
    else setPatientSafetyAlerts([]);

    if (intakeRes.ok) setPatientIntakeSummary(intakeRes.data);
    else setPatientIntakeSummary(null);
  }

  async function handleOpenSoapNote(appointment: DoctorAgendaEntry) {
    setActiveAppointmentForNote(appointment);
    setExistingRecord(null);

    if (appointment.hasClinicalRecord) {
      setIsLoadingRecord(true);
      const res = await getClinicalRecordForAppointmentAction(appointment.appointmentId);
      if (res.ok && res.data) {
        setExistingRecord(res.data);
      }
      setIsLoadingRecord(false);
    }
  }

  const now = Date.now();
  const filteredAgenda = agenda.filter((item) => {
    if (statusFilter === "UPCOMING") {
      return item.status === "CONFIRMED" && new Date(item.scheduledAtUTC).getTime() >= now;
    }
    if (statusFilter === "COMPLETED") {
      return item.status === "COMPLETED";
    }
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left / Main Column: Agenda List & SOAP Note Form */}
      <div className={`space-y-6 ${activePatientId ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"}`}>
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "ALL"
                  ? "bg-teal-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isAr ? `جميع الجلسات (${agenda.length})` : `All Sessions (${agenda.length})`}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("UPCOMING")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "UPCOMING"
                  ? "bg-teal-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isAr ? "القادمة والمؤكدة" : "Upcoming & Confirmed"}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("COMPLETED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "COMPLETED"
                  ? "bg-teal-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isAr ? "المكتملة" : "Completed"}
            </button>
          </div>
        </div>

        {/* Active SOAP Note Form with Complete Prefill (D1 Fix) */}
        {activeAppointmentForNote && (
          <form
            key={activeAppointmentForNote.appointmentId + (existingRecord ? `-${existingRecord.id}` : "-new")}
            action={noteAction}
            className="p-6 bg-white border-2 border-teal-600 rounded-3xl space-y-4 shadow-xl"
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
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr ? "المريض: " : "Patient: "}
                  <strong className="text-slate-800">{activeAppointmentForNote.patientName}</strong> ·{" "}
                  {formatCairo(new Date(activeAppointmentForNote.scheduledAtUTC), isAr ? "ar" : "en")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveAppointmentForNote(null);
                  setExistingRecord(null);
                }}
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
                onClick={() => {
                  setActiveAppointmentForNote(null);
                  setExistingRecord(null);
                }}
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
                {isAr ? "لا توجد جلسات مطابقة للفلاتر المحددة." : "No sessions match the selected filter."}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr
                  ? "يمكنك تغيير الفلتر أو مراجعة جدول العمل الأسبوعي للتأكد من المواعيد المتاحة."
                  : "You can adjust your filters or review your weekly schedule."}
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
                      <div className="flex items-center gap-2">
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
  );
}
