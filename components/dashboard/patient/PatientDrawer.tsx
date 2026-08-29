"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertOctagon,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  HeartHandshake,
  History,
  Phone,
  Shield,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import type { AssessmentHistoryRow } from "@/app/actions/assessments.actions";
import type { SafetyPlanView } from "@/app/actions/safety-plan.actions";
import type { ClinicalRecordView } from "@/app/actions/doctor.actions";
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
  onClose: () => void;
}

export function PatientDrawer({
  patientName,
  patientPhone,
  assessments,
  safetyPlan,
  history,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<"SCALES" | "SAFETY_PLAN" | "HISTORY">("SCALES");
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const hasAnySafetyFlag = assessments.some((a) => a.riskItemEndorsed);

  // Group assessments dynamically by scale type
  const assessmentsByType = ASSESSMENT_TYPES.reduce((acc, type) => {
    const list = assessments.filter((a) => a.type === type);
    if (list.length > 0) acc[type] = list;
    return acc;
  }, {} as Record<AssessmentType, AssessmentHistoryRow[]>);

  const activeScaleTypes = Object.keys(assessmentsByType) as AssessmentType[];

  return (
    <aside
      aria-label="الملف السريري للمريض"
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
              <h3 className="font-bold text-slate-900 text-base">
                {patientName}
              </h3>
              {hasAnySafetyFlag && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                  <ShieldAlert className="w-3 h-3 text-red-600" />
                  مؤشر أمان سريري
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono">
              {patientPhone}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
          title="إغلاق الملف"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 px-2 pt-2 gap-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("SCALES")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${
            activeTab === "SCALES"
              ? "border-teal-800 text-teal-900 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Activity className="w-4 h-4 text-teal-700" />
          المقاييس النفسية ({assessments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SAFETY_PLAN")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${
            activeTab === "SAFETY_PLAN"
              ? "border-teal-800 text-teal-900 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Shield className="w-4 h-4 text-teal-700" />
          خطة الأمان
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("HISTORY")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition ${
            activeTab === "HISTORY"
              ? "border-teal-800 text-teal-900 font-bold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <History className="w-4 h-4 text-teal-700" />
          الجلسات السابقة ({history.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* TAB 1: SCALES */}
        {activeTab === "SCALES" && (
          <div className="space-y-4">
            {activeScaleTypes.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                لم يقم المريض بإجراء أي مقاييس مقننة مكتملة بعد.
              </div>
            ) : (
              activeScaleTypes.map((type) => (
                <ScaleGroupSection
                  key={type}
                  title={ASSESSMENT_SCALES[type].titleAr}
                  type={type}
                  items={assessmentsByType[type]}
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
                  لم يُنشئ المريض خطة أمان بعد.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  يمكنكما صياغتها معاً في الجلسة لمساعدة المريض في أوقات الأزمات.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <SectionBox title="1. علامات الإنذار المبكر للأزمة" items={safetyPlan.warningSigns} />
                <SectionBox title="2. آليات التهدئة الذاتية الداخلية" items={safetyPlan.copingStrategies} />
                <SectionBox title="3. الأماكن والأنشطة المشتتة للانتباه" items={safetyPlan.socialDistractions} />

                {/* Trusted Contacts */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-xs mb-2">
                    4. جهات الاتصال الموثوقة للمساعدة
                  </h4>
                  {safetyPlan.trustedContacts.length === 0 ? (
                    <p className="text-xs text-slate-400">لا توجد جهات مسجلة.</p>
                  ) : (
                    <div className="space-y-2">
                      {safetyPlan.trustedContacts.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-200">
                          <div>
                            <span className="font-semibold text-slate-900">{c.name}</span>
                            {c.relationship && (
                              <span className="text-slate-500 mr-2">({c.relationship})</span>
                            )}
                          </div>
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className="inline-flex items-center gap-1 text-teal-700 hover:underline font-mono font-bold"
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
                    5. جهات الدعم الطبي والمهني
                  </h4>
                  {safetyPlan.professionalContacts.length === 0 ? (
                    <p className="text-xs text-slate-400">لا توجد جهات مسجلة.</p>
                  ) : (
                    <div className="space-y-2">
                      {safetyPlan.professionalContacts.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-slate-200">
                          <div>
                            <span className="font-semibold text-slate-900">{c.name}</span>
                            {c.relationship && (
                              <span className="text-slate-500 mr-2">({c.relationship})</span>
                            )}
                          </div>
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className="inline-flex items-center gap-1 text-teal-700 hover:underline font-mono font-bold"
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

                <SectionBox title="6. خطوات جعل البيئة المحيطة آمنة" items={safetyPlan.environmentSteps} />

                {safetyPlan.reasonsForLiving && (
                  <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-200">
                    <h4 className="font-bold text-teal-900 text-xs mb-1">
                      ✨ أسبابي للتمسك بالحياة
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
                لا توجد تقارير سابقة مسجلة لهذا المريض.
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
                      className="w-full p-3 flex items-center justify-between text-right hover:bg-slate-50 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {record.diagnosis}
                          </span>
                          {record.signedAtUTC ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <FileCheck2 className="w-2.5 h-2.5" />
                              موقّع
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              مسودة
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(record.createdAtUTC).toLocaleDateString("ar-EG", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
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
                            <span className="font-bold text-slate-700">الشكوى: </span>
                            <span className="text-slate-600">{record.chiefComplaint}</span>
                          </div>
                        )}

                        {record.dsm5Codes.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="font-bold text-slate-700">أكواد DSM-5: </span>
                            {record.dsm5Codes.map((code) => (
                              <span
                                key={code}
                                className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[10px] font-bold text-slate-800"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        )}

                        {record.prescriptionNotes && (
                          <div>
                            <span className="font-bold text-slate-700">الخطة الدوائية: </span>
                            <span className="text-slate-600 whitespace-pre-wrap">{record.prescriptionNotes}</span>
                          </div>
                        )}

                        {record.followUpPlan && (
                          <div>
                            <span className="font-bold text-slate-700">خطة المتابعة: </span>
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

function SectionBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
      <h4 className="font-bold text-slate-900 text-xs mb-1.5">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">لا توجد عناصر مسجلة.</p>
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
}: {
  title: string;
  type: AssessmentType;
  items: AssessmentHistoryRow[];
}) {
  if (items.length === 0) return null;
  const latest = items[0];

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
          <p className="text-xs text-slate-500">
            أحدث نتيجة: <strong>{latest.totalScore} / {latest.maxScore}</strong> — {latest.labelAr}
          </p>
        </div>

        {latest.riskItemEndorsed && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-bold border border-red-200">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            إشارة خطر
          </span>
        )}
      </div>

      {/* Subscale breakdown if present on latest */}
      {latest.subscaleScores && latest.subscaleScores.length > 0 && (
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase">الأبعاد السريرية التفصيلية:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {latest.subscaleScores.map((sub) => (
              <div key={sub.key} className="text-[11px] flex justify-between">
                <span className="text-slate-600">{sub.labelAr}:</span>
                <span className="font-mono font-bold text-slate-900">{sub.score}/{sub.maxScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trajectory Timeline */}
      <div className="space-y-1.5 pt-2 border-t border-slate-200">
        <div className="text-[11px] font-semibold text-slate-500 mb-1">مسار التطور التاريخي:</div>
        {items.slice(0, 5).map((item) => {
          const percent = Math.min(Math.round((item.totalScore / item.maxScore) * 100), 100);
          return (
            <div key={item.id} className="space-y-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono">
                  {new Date(item.completedAtUTC).toLocaleDateString("ar-EG", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="font-bold text-slate-800">
                  {item.totalScore}/{item.maxScore} ({item.labelAr})
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    percent > 65 ? "bg-red-500" : percent > 40 ? "bg-amber-500" : "bg-teal-600"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

