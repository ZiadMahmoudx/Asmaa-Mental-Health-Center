"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileCheck2,
  HeartHandshake,
  History,
  Phone,
  Shield,
  ShieldAlert,
  Sparkles,
  Tag,
  User,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { AssessmentHistoryRow } from "@/app/actions/assessments.actions";
import type { SafetyPlanView } from "@/app/actions/safety-plan.actions";
import type {
  ClinicalRecordView,
  IntakeSummaryView,
  SafetyAlertSummary,
} from "@/app/actions/doctor.actions";
import {
  ASSESSMENT_SCALES,
  ASSESSMENT_TYPES,
  type AssessmentType,
} from "@/lib/content/assessment-scales";

interface Props {
  patientName: string;
  patientPhone: string;
  assessments: AssessmentHistoryRow[];
  safetyPlan: SafetyPlanView | null;
  history: ClinicalRecordView[];
  safetyAlerts?: SafetyAlertSummary[];
  intakeSummary?: IntakeSummaryView | null;
  onClose: () => void;
}

export function PatientDrawer({
  patientName,
  patientPhone,
  assessments,
  safetyPlan,
  history,
  safetyAlerts = [],
  intakeSummary = null,
  onClose,
}: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [activeTab, setActiveTab] = useState<"INTAKE" | "SCALES" | "SAFETY_PLAN" | "HISTORY">(
    intakeSummary ? "INTAKE" : "SCALES",
  );
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const hasAnySafetyFlag =
    assessments.some((a) => a.riskItemEndorsed) ||
    safetyAlerts.length > 0 ||
    Boolean(intakeSummary?.crisisFlagged);

  // Group assessments dynamically by scale type
  const assessmentsByType = ASSESSMENT_TYPES.reduce((acc, type) => {
    const list = assessments.filter((a) => a.type === type);
    if (list.length > 0) acc[type] = list;
    return acc;
  }, {} as Record<AssessmentType, AssessmentHistoryRow[]>);

  const activeScaleTypes = Object.keys(assessmentsByType) as AssessmentType[];

  return (
    <aside
      aria-label={isAr ? "الملف السريري للمريض" : "Patient Clinical Chart"}
      className="flex flex-col h-full bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-bold border border-teal-200">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">{patientName}</h3>
              {hasAnySafetyFlag && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  {isAr ? "مؤشر أمان سريري" : "Safety Flag"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono" dir="ltr">
              {patientPhone}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
          title={isAr ? "إغلاق الملف" : "Close chart"}
          aria-label={isAr ? "إغلاق الملف" : "Close chart"}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Clinical Safety Alerts Banner (D2) */}
      {safetyAlerts.length > 0 && (
        <div className="p-3 bg-red-50 border-b border-red-200 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-red-900">
            <AlertOctagon className="w-4 h-4 text-red-600" />
            <span>
              {isAr
                ? `تنبيه أمان سريري عاجل (${safetyAlerts.length})`
                : `Active Clinical Safety Alert (${safetyAlerts.length})`}
            </span>
          </div>
          <div className="space-y-1">
            {safetyAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between text-[11px] p-2 bg-white rounded-lg border border-red-200 text-red-900 font-bold"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                      alert.severity === "CRISIS"
                        ? "bg-red-600 text-white font-black"
                        : "bg-amber-500 text-white font-bold"
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span>{alert.detail}</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  {new Date(alert.createdAtUTC).toLocaleDateString(isAr ? "ar-EG" : "en-GB")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 px-2 pt-2 gap-1 text-sm font-medium overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("INTAKE")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "INTAKE"
              ? "border-teal-800 text-teal-900 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <ClipboardList className="w-4 h-4 text-teal-700" />
          <span>{isAr ? "الفرز الأولي (Intake)" : "Intake Triage"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SCALES")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "SCALES"
              ? "border-teal-800 text-teal-900 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Activity className="w-4 h-4 text-teal-700" />
          <span>{isAr ? `المقاييس (${assessments.length})` : `Screenings (${assessments.length})`}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SAFETY_PLAN")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "SAFETY_PLAN"
              ? "border-teal-800 text-teal-900 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Shield className="w-4 h-4 text-teal-700" />
          <span>{isAr ? "خطة الأمان" : "Safety Plan"}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("HISTORY")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "HISTORY"
              ? "border-teal-800 text-teal-900 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <History className="w-4 h-4 text-teal-700" />
          <span>{isAr ? `السجلات السابقة (${history.length})` : `History (${history.length})`}</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* TAB 0: INTAKE SUMMARY (D6) */}
        {activeTab === "INTAKE" && (
          <div className="space-y-4">
            {!intakeSummary ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                {isAr
                  ? "لا يوجد تقرير فرز أولي مسجل لهذا المريض."
                  : "No initial intake triage assessment on file."}
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Triage Overview Card */}
                <div className="p-4 rounded-2xl bg-teal-950 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-teal-300 font-bold">
                      {isAr ? "درجة أولوية الفرز السريري" : "Triage Urgency Level"}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        intakeSummary.urgencyLevel === "CRISIS_EMERGENCY"
                          ? "bg-red-600 text-white"
                          : intakeSummary.urgencyLevel === "EVALUATE"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-emerald-500 text-white"
                      }`}
                    >
                      {intakeSummary.urgencyLevel}
                    </span>
                  </div>

                  {intakeSummary.crisisFlagged && (
                    <div className="p-2.5 rounded-xl bg-red-900/80 border border-red-500/50 flex items-center gap-2 text-red-100 font-bold">
                      <ShieldAlert className="w-4 h-4 text-red-300 shrink-0" />
                      <span>
                        {isAr
                          ? "تم الإبلاغ عن أفكار إيذاء النفس أو أزمة حادة عند التسجيل."
                          : "Patient disclosed self-harm or acute crisis thoughts at intake."}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-teal-800/80">
                    <div>
                      <span className="text-teal-400 block">{isAr ? "الفئة العمرية" : "Age Group"}</span>
                      <span className="font-bold">{intakeSummary.ageGroup}</span>
                    </div>
                    <div>
                      <span className="text-teal-400 block">
                        {isAr ? "درجة شدة الأعراض" : "Severity Score"}
                      </span>
                      <span className="font-bold font-mono">
                        {intakeSummary.severityScore} / {intakeSummary.maxScore}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Presenting Concerns Tags */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-teal-700" />
                    <span>{isAr ? "الأعراض والشكاوى المحددة (Presenting Concerns)" : "Presenting Concerns"}</span>
                  </h4>
                  {intakeSummary.concerns.length === 0 ? (
                    <p className="text-slate-400 text-xs">{isAr ? "لم تُحدد وسوم." : "None specified."}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {intakeSummary.concerns.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 font-bold text-[11px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medical & Therapy History */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block mb-1">
                      {isAr ? "تاريخ العلاج النفسي السابق" : "Previous Therapy History"}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {intakeSummary.therapyHistory}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-bold block mb-1">
                      {isAr ? "تاريخ الأدوية النفسية" : "Psychiatric Medication History"}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {intakeSummary.medicationHistory}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: SCALES */}
        {activeTab === "SCALES" && (
          <div className="space-y-4">
            {activeScaleTypes.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                {isAr
                  ? "لم يقم المريض بإجراء أي مقاييس مقننة مكتملة بعد."
                  : "No completed standardized assessments on file for this patient."}
              </div>
            ) : (
              activeScaleTypes.map((type) => (
                <ScaleGroupSection
                  key={type}
                  title={isAr ? ASSESSMENT_SCALES[type].titleAr : ASSESSMENT_SCALES[type].titleEn}
                  type={type}
                  items={assessmentsByType[type]}
                  isAr={isAr}
                />
              ))
            )}
          </div>
        )}

        {/* TAB 2: SAFETY PLAN */}
        {activeTab === "SAFETY_PLAN" && (
          <div className="space-y-4">
            {!safetyPlan || !safetyPlan.updatedAtUTC ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <Shield className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-700 font-medium">
                  {isAr ? "لم يُنشئ المريض خطة أمان بعد." : "No crisis safety plan created yet."}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {isAr
                    ? "يمكنكما صياغتها معاً في الجلسة لمساعدة المريض في أوقات الأزمات."
                    : "You can collaborate during the consultation to establish a Stanley-Brown safety plan."}
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <SectionBox
                  title={isAr ? "1. علامات الإنذار المبكر للأزمة" : "1. Warning Signs of an Impending Crisis"}
                  items={safetyPlan.warningSigns}
                  isAr={isAr}
                />
                <SectionBox
                  title={isAr ? "2. آليات التهدئة الذاتية الداخلية" : "2. Internal Coping Strategies"}
                  items={safetyPlan.copingStrategies}
                  isAr={isAr}
                />
                <SectionBox
                  title={isAr ? "3. الأماكن والأنشطة المشتتة للانتباه" : "3. Social Distractions & Safe Places"}
                  items={safetyPlan.socialDistractions}
                  isAr={isAr}
                />

                {/* Trusted Contacts */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-xs mb-2">
                    {isAr ? "4. جهات الاتصال الموثوقة للمساعدة" : "4. Trusted Support Contacts"}
                  </h4>
                  {safetyPlan.trustedContacts.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      {isAr ? "لا توجد جهات مسجلة." : "No contacts registered."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {safetyPlan.trustedContacts.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-200"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{c.name}</span>
                            {c.relationship && (
                              <span className="text-slate-500 mx-2">({c.relationship})</span>
                            )}
                          </div>
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className="inline-flex items-center gap-1 text-teal-700 hover:underline font-mono font-bold"
                              dir="ltr"
                            >
                              <Phone className="w-3 h-3" />
                              {c.phone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Professional Contacts */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-xs mb-2">
                    {isAr ? "5. جهات الدعم الطبي والمهني" : "5. Healthcare Professionals & Agencies"}
                  </h4>
                  {safetyPlan.professionalContacts.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      {isAr ? "لا توجد جهات مسجلة." : "No professional contacts registered."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {safetyPlan.professionalContacts.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-200"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{c.name}</span>
                            {c.relationship && (
                              <span className="text-slate-500 mx-2">({c.relationship})</span>
                            )}
                          </div>
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className="inline-flex items-center gap-1 text-teal-700 hover:underline font-mono font-bold"
                              dir="ltr"
                            >
                              <Phone className="w-3 h-3" />
                              {c.phone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <SectionBox
                  title={isAr ? "6. خطوات جعل البيئة المحيطة آمنة" : "6. Making the Environment Safe"}
                  items={safetyPlan.environmentSteps}
                  isAr={isAr}
                />

                {safetyPlan.reasonsForLiving && (
                  <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-200">
                    <h4 className="font-bold text-teal-900 text-xs mb-1">
                      {isAr ? "✨ أسبابي للتمسك بالحياة" : "✨ Reasons for Living"}
                    </h4>
                    <p className="text-xs text-teal-950 whitespace-pre-wrap leading-relaxed">
                      {safetyPlan.reasonsForLiving}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CLINICAL RECORDS HISTORY */}
        {activeTab === "HISTORY" && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                {isAr
                  ? "لا توجد تقارير سابقة مسجلة لهذا المريض."
                  : "No prior clinical notes recorded for this patient."}
              </div>
            ) : (
              history.map((record) => {
                const isExpanded = expandedRecordId === record.id;
                return (
                  <div
                    key={record.id}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                      className="w-full p-3 flex items-center justify-between text-start hover:bg-slate-50 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{record.diagnosis}</span>
                          {record.signedAtUTC ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <FileCheck2 className="w-2.5 h-2.5" />
                              {isAr ? "موقّع" : "Signed"}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              {isAr ? "مسودة" : "Draft"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(record.createdAtUTC).toLocaleDateString(
                            isAr ? "ar-EG" : "en-GB",
                            {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-3 border-t border-slate-100 space-y-2 text-xs bg-slate-50/50">
                        {record.chiefComplaint && (
                          <div>
                            <span className="font-bold text-slate-700">
                              {isAr ? "الشكوى: " : "Chief Complaint: "}
                            </span>
                            <span className="text-slate-600">{record.chiefComplaint}</span>
                          </div>
                        )}

                        {record.dsm5Codes.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="font-bold text-slate-700">
                              {isAr ? "أكواد DSM-5: " : "DSM-5 Codes: "}
                            </span>
                            {record.dsm5Codes.map((code) => (
                              <span
                                key={code}
                                className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px] font-bold text-slate-800"
                                dir="ltr"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        )}

                        {record.prescriptionNotes && (
                          <div>
                            <span className="font-bold text-slate-700">
                              {isAr ? "الخطة الدوائية: " : "Prescription Plan: "}
                            </span>
                            <span className="text-slate-600 whitespace-pre-wrap">
                              {record.prescriptionNotes}
                            </span>
                          </div>
                        )}

                        {record.followUpPlan && (
                          <div>
                            <span className="font-bold text-slate-700">
                              {isAr ? "خطة المتابعة: " : "Follow-up: "}
                            </span>
                            <span className="text-slate-600">{record.followUpPlan}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function SectionBox({
  title,
  items,
  isAr,
}: {
  title: string;
  items: string[];
  isAr: boolean;
}) {
  return (
    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
      <h4 className="font-bold text-slate-900 text-xs mb-1.5">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">
          {isAr ? "لا توجد عناصر مسجلة." : "No entries recorded."}
        </p>
      ) : (
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
          {items.map((it, idx) => (
            <li key={idx}>{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScaleGroupSection({
  title,
  type,
  items,
  isAr,
}: {
  title: string;
  type: AssessmentType;
  items: AssessmentHistoryRow[];
  isAr: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <h4 className="font-bold text-slate-900 text-xs">{title}</h4>
        <span className="text-[10px] text-slate-500 font-bold">
          {items.length} {isAr ? "سجلات" : "records"}
        </span>
      </div>
      <div className="divide-y divide-slate-100 text-xs">
        {items.map((it) => (
          <div key={it.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">
                  {isAr ? "الدرجة الكلية: " : "Score: "}
                  <strong className="font-mono text-teal-900">{it.totalScore}</strong> / {it.maxScore}
                </span>
                {it.severityBand && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {it.severityBand}
                  </span>
                )}
                {it.riskItemEndorsed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                    {isAr ? "مؤشر خطر" : "Risk Item"}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {it.completedAtUTC
                  ? new Date(it.completedAtUTC).toLocaleDateString(isAr ? "ar-EG" : "en-GB", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
