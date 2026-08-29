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
  User,
  Video,
  X,
} from "lucide-react";
import type { ClinicalRecordView, DoctorAgendaEntry } from "@/app/actions/doctor.actions";
import {
  getPatientHistoryAction,
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
  const router = useRouter();

  // Active drawer & active SOAP note states
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [activePatientName, setActivePatientName] = useState<string>("");
  const [activePatientPhone, setActivePatientPhone] = useState<string>("");
  const [activeAppointmentForNote, setActiveAppointmentForNote] = useState<DoctorAgendaEntry | null>(null);

  // Loaded patient clinical data
  const [patientAssessments, setPatientAssessments] = useState<AssessmentHistoryRow[]>([]);
  const [patientSafetyPlan, setPatientSafetyPlan] = useState<SafetyPlanView | null>(null);
  const [patientHistory, setPatientHistory] = useState<ClinicalRecordView[]>([]);
  const [isLoadingPatientData, setIsLoadingPatientData] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UPCOMING" | "COMPLETED">("ALL");

  // SOAP Note Form state
  const [noteState, noteAction, isNotePending] = useActionState(saveClinicalRecordAction, null);

  useEffect(() => {
    if (noteState?.ok) {
      setActiveAppointmentForNote(null);
      router.refresh();
    }
  }, [noteState, router]);

  async function openPatientDrawer(appointment: DoctorAgendaEntry) {
    setActivePatientId(appointment.patientId);
    setActivePatientName(appointment.patientName);
    setActivePatientPhone(appointment.patientPhone);
    setIsLoadingPatientData(true);

    const [assessmentsRes, safetyPlanRes, historyRes] = await Promise.all([
      getPatientAssessmentsAction(appointment.patientId),
      getPatientSafetyPlanAction(appointment.patientId),
      getPatientHistoryAction(appointment.patientId),
    ]);

    setIsLoadingPatientData(false);

    if (assessmentsRes.ok) setPatientAssessments(assessmentsRes.data);
    else setPatientAssessments([]);

    if (safetyPlanRes.ok) setPatientSafetyPlan(safetyPlanRes.data);
    else setPatientSafetyPlan(null);

    if (historyRes.ok) setPatientHistory(historyRes.data);
    else setPatientHistory([]);
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === "ALL"
                  ? "bg-teal-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              جميع الجلسات ({agenda.length})
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
              القادمة والمؤكدة
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
              المكتملة
            </button>
          </div>
        </div>

        {/* Active SOAP Note Form */}
        {activeAppointmentForNote && (
          <form
            action={noteAction}
            className="p-6 bg-white border-2 border-teal-600 rounded-3xl space-y-4 shadow-xl"
          >
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <input type="hidden" name="appointmentId" value={activeAppointmentForNote.appointmentId} />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-teal-700" />
                  توثيق التقرير الإكلينيكي (Clinical SOAP Note)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  المريض: <strong className="text-slate-800">{activeAppointmentForNote.patientName}</strong> ·{" "}
                  {formatCairo(new Date(activeAppointmentForNote.scheduledAtUTC))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAppointmentForNote(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!noteState?.ok && noteState?.messageAr && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {noteState.messageAr}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الشكوى الرئيسية (Chief Complaint)
              </label>
              <textarea
                name="chiefComplaint"
                rows={2}
                placeholder="أعراض المريض كما يصفها..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  التشخيص الطبي الإكلينيكي (Diagnosis) <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="diagnosis"
                  rows={2}
                  required
                  placeholder="التشخيص المعتمد للجلسة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  أكواد DSM-5 (مفصولة بفواصل)
                </label>
                <input
                  type="text"
                  name="dsm5Codes"
                  placeholder="F32.1, F41.1, F51.01"
                  dir="ltr"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الخطة الدوائية والعلاجية (Plan / Prescription)
                </label>
                <textarea
                  name="prescriptionNotes"
                  rows={3}
                  placeholder="الجرعات والتعليمات..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  توصيات المتابعة (Follow-up)
                </label>
                <textarea
                  name="followUpPlan"
                  rows={3}
                  placeholder="موعد المتابعة، الواجبات السلوكية..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تقييم درجة الخطورة (Risk Level)
              </label>
              <select
                name="riskLevel"
                defaultValue="LOW"
                className="w-full sm:w-1/2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
              >
                <option value="LOW">منخفضة (Low)</option>
                <option value="MODERATE">متوسطة (Moderate)</option>
                <option value="HIGH">مرتفعة (High)</option>
                <option value="CRITICAL">حرجة / طوارئ (Critical)</option>
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
                توقيع التقرير الطبي نهائياً. بعد التوقيع لا يمكن تعديله، ويصبح جزءاً من السجل القانوني للمركز.
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveAppointmentForNote(null)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl text-slate-700"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isNotePending}
                className="inline-flex items-center gap-2 px-6 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
              >
                {isNotePending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                حفظ التقرير
              </button>
            </div>
          </form>
        )}

        {/* Sessions List */}
        <div className="space-y-4">
          {filteredAgenda.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200/90 rounded-3xl text-slate-400 shadow-sm">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="text-base font-bold text-slate-600">
                لا توجد جلسات تطابق التصفية.
              </p>
            </div>
          ) : (
            filteredAgenda.map((item) => {
              const dateObj = new Date(item.scheduledAtUTC);
              const statusBadge = APPOINTMENT_STATUS_LABELS[item.status] || { ar: item.status };

              return (
                <div
                  key={item.appointmentId}
                  className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4 hover:border-teal-500/40 hover:shadow-md transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 border border-teal-100">
                        {item.type === "ONLINE" ? <Video className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {item.patientName}
                          </h4>
                          <span className="text-xs font-mono text-slate-400">({item.patientPhone})</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.type === "ONLINE" ? "جلسة أونلاين عبر زووم" : "زيارة حضورية بالعيادة"} ·{" "}
                          <span className="font-mono font-bold text-slate-700">{formatEgp(item.priceEGP)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.hasClinicalRecord && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                          {item.clinicalRecordSigned ? (
                            <>
                              <FileCheck2 className="w-3 h-3 text-emerald-600" />
                              تقرير موقّع
                            </>
                          ) : (
                            <>
                              <FileSignature className="w-3 h-3 text-amber-600" />
                              مسودة تقرير
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
                        {statusBadge.ar}
                      </span>
                    </div>
                  </div>

                  {/* Scheduled Instant & Reschedule trace */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Clock className="w-4 h-4 text-teal-700" />
                      <span>{formatCairo(dateObj)}</span>
                      <span className="text-slate-500 font-mono">({item.durationMinutes} دقيقة)</span>
                    </div>

                    {item.rescheduledFromUTC && (
                      <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold">
                        معدل من: {formatCairo(new Date(item.rescheduledFromUTC))}
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
                        إرسال تذكير بالواتساب
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
                      onOpenSoapNote={() => setActiveAppointmentForNote(item)}
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
                <p className="text-xs text-slate-500 font-semibold">جاري فتح الملف السريري والمقاييس...</p>
              </div>
            </div>
          ) : (
            <PatientDrawer
              patientName={activePatientName}
              patientPhone={activePatientPhone}
              assessments={patientAssessments}
              safetyPlan={patientSafetyPlan}
              history={patientHistory}
              onClose={() => setActivePatientId(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
