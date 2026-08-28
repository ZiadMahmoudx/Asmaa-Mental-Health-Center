"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CalendarClock,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  MoreHorizontal,
  Unlock,
  Video,
  X,
} from "lucide-react";
import type { AdminAppointmentRow } from "@/app/actions/roster.actions";
import { adminCancelAppointmentAction, assignMeetingLinkAction } from "@/app/actions/admin.actions";
import { releaseReservationAction } from "@/app/actions/doctor.actions";
import { CSRF_FIELD } from "@/lib/constants";
import { RescheduleDialog } from "../dashboard/agenda/RescheduleDialog";

interface Props {
  appointment: AdminAppointmentRow;
  csrfToken: string;
}

export function AdminAppointmentRowActions({ appointment, csrfToken }: Props) {
  const router = useRouter();

  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);

  const [cancelState, cancelAction, isCancelPending] = useActionState(adminCancelAppointmentAction, null);
  const [releaseState, releaseAction, isReleasePending] = useActionState(releaseReservationAction, null);
  const [zoomState, zoomAction, isZoomPending] = useActionState(assignMeetingLinkAction, null);

  useEffect(() => {
    if (cancelState?.ok) {
      setShowCancelModal(false);
      router.refresh();
    }
  }, [cancelState, router]);

  useEffect(() => {
    if (releaseState?.ok) {
      router.refresh();
    }
  }, [releaseState, router]);

  useEffect(() => {
    if (zoomState?.ok) {
      setShowZoomModal(false);
      router.refresh();
    }
  }, [zoomState, router]);

  const canReschedule = ["CONFIRMED", "PAYMENT_UNDER_REVIEW"].includes(appointment.status);
  const canCancel = !["CANCELLED", "COMPLETED", "EXPIRED", "REJECTED"].includes(appointment.status);
  const isPendingHold = appointment.status === "PENDING_PAYMENT_PROOF";

  return (
    <div className="flex items-center justify-center gap-1.5">
      {/* Reschedule Button */}
      {canReschedule && (
        <button
          type="button"
          onClick={() => setShowReschedule(true)}
          title="إعادة جدولة الموعد"
          className="p-1.5 text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
        >
          <CalendarClock className="w-4 h-4" />
        </button>
      )}

      {/* Assign Zoom Link */}
      {appointment.type === "ONLINE" && appointment.status === "CONFIRMED" && (
        <button
          type="button"
          onClick={() => setShowZoomModal(true)}
          title="إضافة / تعديل رابط زووم"
          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
        >
          <Video className="w-4 h-4" />
        </button>
      )}

      {/* Release Pending Hold */}
      {isPendingHold && (
        <form action={releaseAction}>
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <input type="hidden" name="appointmentId" value={appointment.id} />
          <button
            type="submit"
            disabled={isReleasePending}
            title="تحرير الحجز المعلق فوراً"
            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
          >
            {isReleasePending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
          </button>
        </form>
      )}

      {/* Cancel Button */}
      {canCancel && (
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          title="إلغاء الحجز إدارياً"
          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
        >
          <Ban className="w-4 h-4" />
        </button>
      )}

      {/* Reschedule Dialog Modal */}
      {showReschedule && (
        <RescheduleDialog
          appointmentId={appointment.id}
          patientName={appointment.patientName}
          doctorId={appointment.doctorId}
          type={appointment.type}
          durationMinutes={appointment.durationMinutes}
          currentScheduledAtUTC={appointment.scheduledAtUTC}
          csrfToken={csrfToken}
          isAdmin={true}
          onClose={() => setShowReschedule(false)}
        />
      )}

      {/* Admin Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-red-600 text-sm flex items-center gap-2">
                <Ban className="w-4 h-4" />
                إلغاء الحجز إدارياً
              </h3>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form action={cancelAction} className="space-y-4">
              <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
              <input type="hidden" name="appointmentId" value={appointment.id} />

              {!cancelState?.ok && cancelState?.messageAr && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {cancelState.messageAr}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب الإلغاء
                </label>
                <textarea
                  name="reason"
                  rows={3}
                  placeholder="سبب إلغاء الحجز من الإدارة..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  disabled={isCancelPending}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {isCancelPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  تأكيد الإلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {showZoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-600" />
                رابط جلسة زووم
              </h3>
              <button
                type="button"
                onClick={() => setShowZoomModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form action={zoomAction} className="space-y-4">
              <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
              <input type="hidden" name="appointmentId" value={appointment.id} />

              {!zoomState?.ok && zoomState?.messageAr && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {zoomState.messageAr}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رابط زووم (نطاق zoom.us حصراً)
                </label>
                <input
                  type="url"
                  name="zoomMeetingUrl"
                  required
                  defaultValue={appointment.zoomMeetingUrl ?? ""}
                  placeholder="https://us04web.zoom.us/j/..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowZoomModal(false)}
                  className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isZoomPending}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {isZoomPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  حفظ الرابط
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
