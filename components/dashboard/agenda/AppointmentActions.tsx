"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  FileSignature,
  Loader2,
  MessageCircle,
  Video,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { DoctorAgendaEntry } from "@/app/actions/doctor.actions";
import {
  completeAppointmentAction,
  doctorCancelAppointmentAction,
} from "@/app/actions/doctor.actions";
import { assignMeetingLinkAction } from "@/app/actions/admin.actions";
import { CSRF_FIELD } from "@/lib/constants";
import { RescheduleDialog } from "./RescheduleDialog";

interface Props {
  appointment: DoctorAgendaEntry;
  csrfToken: string;
  isAdmin?: boolean;
  onOpenPatientDrawer: () => void;
  onOpenSoapNote: () => void;
}

export function AppointmentActions({
  appointment,
  csrfToken,
  isAdmin = false,
  onOpenPatientDrawer,
  onOpenSoapNote,
}: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);

  const [cancelState, cancelAction, isCancelPending] = useActionState(doctorCancelAppointmentAction, null);
  const [completeState, completeAction, isCompletePending] = useActionState(completeAppointmentAction, null);
  const [zoomState, zoomAction, isZoomPending] = useActionState(assignMeetingLinkAction, null);

  useEffect(() => {
    if (completeState?.ok) router.refresh();
  }, [completeState, router]);

  useEffect(() => {
    if (zoomState?.ok) {
      setShowZoomModal(false);
      router.refresh();
    }
  }, [zoomState, router]);

  const isConfirmed = appointment.status === "CONFIRMED";
  const isPast = new Date(appointment.scheduledAtUTC).getTime() <= Date.now();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* View Clinical Drawer */}
      <button
        type="button"
        onClick={onOpenPatientDrawer}
        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition border border-slate-200"
      >
        {isAr ? "الملف السريري والمقاييس" : "Clinical Records & Scales"}
      </button>

      {/* SOAP Note Button */}
      {isConfirmed && (
        <button
          type="button"
          onClick={onOpenSoapNote}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 ${
            appointment.hasClinicalRecord
              ? "bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100"
              : "bg-teal-800 hover:bg-teal-900 text-white shadow-sm"
          }`}
        >
          <FileSignature className="w-3.5 h-3.5" />
          <span>
            {appointment.hasClinicalRecord
              ? isAr ? "تعديل التقرير الطبي" : "Edit Clinical Note"
              : isAr ? "كتابة التقرير الطبي" : "Document SOAP Note"}
          </span>
        </button>
      )}

      {/* Complete Session Button */}
      {isConfirmed && isPast && (
        <form action={completeAction}>
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <input type="hidden" name="appointmentId" value={appointment.appointmentId} />
          <button
            type="submit"
            disabled={isCompletePending}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isCompletePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{isAr ? "إتمام الجلسة" : "Mark Completed"}</span>
          </button>
        </form>
      )}

      {/* Reschedule Button */}
      {isConfirmed && (
        <button
          type="button"
          onClick={() => setShowReschedule(true)}
          className="px-3.5 py-2 border border-slate-300 hover:border-teal-600 hover:bg-teal-50 text-slate-800 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
        >
          <CalendarClock className="w-3.5 h-3.5 text-teal-700" />
          <span>{isAr ? "تعديل الموعد" : "Reschedule"}</span>
        </button>
      )}

      {/* Assign / Replace Zoom Link (Online only) */}
      {appointment.type === "ONLINE" && isConfirmed && (
        <button
          type="button"
          onClick={() => setShowZoomModal(true)}
          className="px-3.5 py-2 border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-blue-700 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
        >
          <Video className="w-3.5 h-3.5" />
          <span>
            {appointment.zoomMeetingUrl
              ? isAr ? "تعديل رابط زووم" : "Edit Zoom Link"
              : isAr ? "إضافة رابط زووم" : "Add Zoom Link"}
          </span>
        </button>
      )}

      {/* Cancel Appointment Button */}
      {isConfirmed && (
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition inline-flex items-center gap-1"
        >
          <Ban className="w-3.5 h-3.5" />
          <span>{isAr ? "إلغاء" : "Cancel"}</span>
        </button>
      )}

      {/* Reschedule Dialog Modal */}
      {showReschedule && (
        <RescheduleDialog
          appointmentId={appointment.appointmentId}
          patientName={appointment.patientName}
          doctorId={appointment.doctorId}
          type={appointment.type}
          durationMinutes={appointment.durationMinutes}
          currentScheduledAtUTC={appointment.scheduledAtUTC}
          csrfToken={csrfToken}
          isAdmin={isAdmin}
          onClose={() => setShowReschedule(false)}
        />
      )}

      {/* Doctor Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-red-600 text-sm flex items-center gap-2">
                <Ban className="w-4 h-4" />
                <span>{isAr ? "إلغاء الموعد للمريض" : "Cancel Patient Appointment"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={isAr ? "إغلاق" : "Close"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cancelState?.ok ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-center">
                <p className="text-xs font-bold text-emerald-900">
                  {isAr
                    ? "تم إلغاء الموعد وتحرير الوقت في جدولك بنجاح."
                    : "Appointment cancelled and slot unblocked successfully."}
                </p>
                <a
                  href={cancelState.data.whatsappCancelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{isAr ? "إرسال رسالة الاعتذار للمريض عبر واتساب" : "Send WhatsApp Apology to Patient"}</span>
                </a>
              </div>
            ) : (
              <form action={cancelAction} className="space-y-4">
                <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                <input type="hidden" name="appointmentId" value={appointment.appointmentId} />

                {!cancelState?.ok && cancelState && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                    {isAr ? cancelState.messageAr : cancelState.messageEn ?? cancelState.messageAr}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr
                      ? "سبب الإلغاء (إلزامي / سيصل للمريض في رسالة الاعتذار)"
                      : "Cancellation Reason (Mandatory / Sent via WhatsApp)"}
                  </label>
                  <textarea
                    name="reason"
                    rows={3}
                    required
                    placeholder={
                      isAr
                        ? "اكتب سبب الإلغاء بوضوح (مثال: ظرف طبي طارئ للاستشاري...)"
                        : "State the reason clearly (e.g. Clinical emergency...)"
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
                  >
                    {isAr ? "تراجع" : "Back"}
                  </button>
                  <button
                    type="submit"
                    disabled={isCancelPending}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
                  >
                    {isCancelPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isAr ? "تأكيد الإلغاء" : "Confirm Cancellation"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Zoom Link Modal */}
      {showZoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-600" />
                <span>{isAr ? "رابط جلسة زووم (Zoom Meeting)" : "Zoom Meeting Link"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowZoomModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={isAr ? "إغلاق" : "Close"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form action={zoomAction} className="space-y-4">
              <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
              <input type="hidden" name="appointmentId" value={appointment.appointmentId} />

              {!zoomState?.ok && zoomState && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {isAr ? zoomState.messageAr : zoomState.messageEn ?? zoomState.messageAr}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "رابط الاجتماع (نطاق zoom.us حصراً)" : "Meeting URL (zoom.us only)"}
                </label>
                <input
                  type="url"
                  name="zoomMeetingUrl"
                  required
                  defaultValue={appointment.zoomMeetingUrl ?? ""}
                  placeholder="https://us04web.zoom.us/j/..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "كلمة المرور للجلسة (اختياري)" : "Passcode (Optional)"}
                </label>
                <input
                  type="text"
                  name="zoomPasscode"
                  placeholder="Passcode..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                  dir="ltr"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowZoomModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isZoomPending}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
                >
                  {isZoomPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isAr ? "حفظ الرابط" : "Save Link"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
