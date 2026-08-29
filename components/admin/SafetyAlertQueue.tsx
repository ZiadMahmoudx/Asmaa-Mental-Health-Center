"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  MessageCircle,
  Phone,
  ShieldAlert,
  UserCheck,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  acknowledgeSafetyAlertAction,
  resolveSafetyAlertAction,
  type SafetyAlertRow,
} from "@/app/actions/safety.actions";
import { buildWhatsAppLink, formatCairo } from "@/lib/whatsapp";

interface Props {
  alerts: SafetyAlertRow[];
  csrfToken: string;
}

export function SafetyAlertQueue({ alerts, csrfToken }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  const [selectedAlertForResolve, setSelectedAlertForResolve] = useState<SafetyAlertRow | null>(null);

  const [ackState, ackAction, isAcking] = useActionState(acknowledgeSafetyAlertAction, null);
  const [resolveState, resolveAction, isResolving] = useActionState(resolveSafetyAlertAction, null);

  useEffect(() => {
    if (ackState?.ok || resolveState?.ok) {
      if (resolveState?.ok) {
        setSelectedAlertForResolve(null);
      }
      router.refresh();
    }
  }, [ackState, resolveState, router]);

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-alabaster-border p-8 text-center space-y-2">
        <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
        <p className="text-sm font-bold text-teal-950">
          {isAr ? "لا توجد تنبيهات أمان أو حالات حرجة مفتوحة" : "No open safety alerts or crisis cases"}
        </p>
        <p className="text-[11px] text-gray-500">
          {isAr
            ? "تظهر هنا فوراً أي حالة يفصح فيها المريض عن أفكار إيذاء النفس في المقاييس السريرية أو استبيان الفرز الأولي."
            : "Any disclosure of self-harm or crisis in clinical scales or intake surveys will appear here instantly."}
        </p>
      </div>
    );
  }

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledgedAtUTC).length;

  return (
    <div className="space-y-4">
      {/* Alert Header Counter */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-red-50 border border-red-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-700">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-red-950">
              {isAr ? "طابور طوارئ الأمان النفسي الموحد" : "Unified Psychological Safety Alert Queue"}
            </h3>
            <p className="text-[11px] text-red-700">
              {isAr
                ? `يوجد ${alerts.length} حالة تتطلب تدخلاً ومتابعة (${unacknowledgedCount} بانتظار استلام الموظف)`
                : `${alerts.length} active cases requiring follow-up (${unacknowledgedCount} unacknowledged)`}
            </p>
          </div>
        </div>
      </div>

      {ackState && !ackState.ok && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-800">
          {isAr ? ackState.messageAr : ackState.messageEn}
        </div>
      )}

      {/* Alerts List */}
      <ul className="space-y-3">
        {alerts.map((alert) => {
          const isAcknowledged = Boolean(alert.acknowledgedAtUTC);

          return (
            <li
              key={alert.id}
              className={`rounded-3xl border p-5 space-y-4 transition ${
                isAcknowledged
                  ? "bg-white border-slate-200 shadow-sm"
                  : "bg-red-50/70 border-red-300 shadow-md ring-1 ring-red-400/20"
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-extrabold text-slate-900">{alert.patientName}</h4>

                    {alert.severity === "CRISIS" ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {isAr ? "بلاغ حرج (طوارئ)" : "Crisis Alert"}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                        {isAr ? "مستوى مرتفع" : "Elevated Risk"}
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {alert.source === "INTAKE"
                        ? isAr
                          ? "استبيان الفرز (Intake)"
                          : "Intake Triage"
                        : isAr
                        ? "مقياس سريري (Assessment)"
                        : "Clinical Scale"}
                    </span>

                    {alert.detail.endsWith("_SAFETY_RETRACTED") && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                        {isAr ? "إفصاح تم التراجع عنه قبل الإرسال" : "Retracted in final submit"}
                      </span>
                    )}

                    {alert.detail.endsWith("_SAFETY_DRAFT") && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-800 text-[10px] font-bold">
                        {isAr ? "مسودة قيد التعبئة" : "In-progress draft"}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatCairo(new Date(alert.createdAtUTC))}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">{alert.patientPhone}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400 font-mono text-[10px]">[{alert.detail}]</span>
                  </p>

                  {isAcknowledged && (
                    <p className="text-[11px] text-teal-800 font-medium pt-0.5">
                      {isAr
                        ? `✓ قيد المتابعة بواسطة: ${alert.acknowledgedByName ?? "طاقم العمل"}`
                        : `✓ Under active follow-up by: ${alert.acknowledgedByName ?? "Staff"}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isAcknowledged && (
                    <form action={ackAction}>
                      <input type="hidden" name="csrfToken" value={csrfToken} />
                      <input type="hidden" name="alertId" value={alert.id} />
                      <button
                        type="submit"
                        disabled={isAcking}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isAr ? "استلام ومتابعة" : "Acknowledge"}
                      </button>
                    </form>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedAlertForResolve(alert)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {isAr ? "إغلاق التنبيه وتوثيق النتيجة" : "Resolve"}
                  </button>
                </div>
              </div>

              {/* Direct Reach-out Links */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60">
                <a
                  href={`tel:${alert.patientPhone}`}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {isAr ? "اتصال فوري بالمريض" : "Call Patient"}
                </a>

                <a
                  href={buildWhatsAppLink(
                    alert.patientPhone,
                    isAr
                      ? `مرحباً ${alert.patientName}، معك فريق الدعم الطبي بمركز أسما للصحة النفسية. تواصلنا معك للاطمئنان عليك وتقديم المساندة الكاملة لك الآن. سلامتك أمانة تهمنا. 🌿`
                      : `Hello ${alert.patientName}, this is the clinical team at Asmaa Mental Health Center checking in to support you.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5B] text-white text-[11px] font-extrabold transition flex items-center gap-1.5 shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {isAr ? "مراسلة عبر واتساب" : "WhatsApp"}
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Resolution Modal */}
      {selectedAlertForResolve && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-700" />
                {isAr ? "توثيق وإنهاء بلاغ الأمان" : "Resolve Safety Alert"}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAlertForResolve(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <p className="text-xs font-bold text-slate-900">{selectedAlertForResolve.patientName}</p>
              <p className="text-[11px] text-slate-500 font-mono">{selectedAlertForResolve.patientPhone}</p>
            </div>

            {resolveState && !resolveState.ok && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
                {isAr ? resolveState.messageAr : resolveState.messageEn}
              </div>
            )}

            <form action={resolveAction} className="space-y-3.5">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="alertId" value={selectedAlertForResolve.id} />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "نتيجة التواصل مع المريض *" : "Intervention Outcome *"}
                </label>
                <select
                  name="outcome"
                  required
                  defaultValue="CONTACTED"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                >
                  <option value="CONTACTED">{isAr ? "تم التواصل وتقديم الدعم بنجاح (CONTACTED)" : "Contacted & Supported"}</option>
                  <option value="NO_ANSWER">{isAr ? "لا يوجد رد على الهاتف / الواتساب (NO_ANSWER)" : "No Answer"}</option>
                  <option value="ESCALATED_EMERGENCY">{isAr ? "تم تصعيد الحالة للطوارئ والإحالة الطبية (ESCALATED_EMERGENCY)" : "Escalated to Emergency"}</option>
                  <option value="FALSE_POSITIVE">{isAr ? "تم التوضيح بأن الإجابة كانت غير مقصودة (FALSE_POSITIVE)" : "False Positive"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "ملاحظات التوثيق السريري (اختياري)" : "Clinical Notes (Optional)"}
                </label>
                <textarea
                  name="resolutionNotes"
                  rows={3}
                  maxLength={500}
                  placeholder={isAr ? "تم التحدث مع المريض وتقديم رقم الطوارئ 16328 والتأكيد على حضور الجلسة القادمة..." : "Document outcome..."}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isResolving}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  {isResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isAr ? "حفظ التوثيق وإغلاق البلاغ" : "Confirm Resolution"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAlertForResolve(null)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
