"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CalendarOff,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import type { ForceTimeOffResult, TimeOffView } from "@/app/actions/doctor.actions";
import {
  addTimeOffAction,
  cancelTimeOffAction,
  forceTimeOffAction,
} from "@/app/actions/doctor.actions";
import { CSRF_FIELD } from "@/lib/constants";
import { formatCairo } from "@/lib/whatsapp";
import {
  cairoDateTimeLocalToUtc,
  utcDateToCairoDateTimeLocal,
} from "@/lib/time/cairo";

interface Props {
  timeOff: TimeOffView[];
  csrfToken: string;
  isAdmin?: boolean;
  doctorId?: string;
}

export function TimeOffManager({ timeOff, csrfToken, isAdmin = false, doctorId }: Props) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [showForceModal, setShowForceModal] = useState(false);

  const [addState, addAction, isAddPending] = useActionState(addTimeOffAction, null);
  const [cancelState, cancelAction, isCancelPending] = useActionState(cancelTimeOffAction, null);
  const [forceState, forceAction, isForcePending] = useActionState(forceTimeOffAction, null);

  useEffect(() => {
    if (addState?.ok) {
      setIsAdding(false);
      router.refresh();
    }
  }, [addState, router]);

  useEffect(() => {
    if (cancelState?.ok) {
      router.refresh();
    }
  }, [cancelState, router]);

  useEffect(() => {
    if (forceState?.ok) {
      setShowForceModal(false);
      setIsAdding(false);
      router.refresh();
    }
  }, [forceState, router]);

  // Check if add failed due to conflict
  const isConflict = addState && !addState.ok && addState.code === "CONFLICT";

  const now = new Date();
  const defaultStart = utcDateToCairoDateTimeLocal(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const defaultEnd = utcDateToCairoDateTimeLocal(new Date(now.getTime() + 48 * 60 * 60 * 1000));

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            إدارة الإجازات والإغلاق المؤقت (Blackout Dates)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            تسجيل فترات السفر والمؤتمرات وإجازات العيادة لحجب المواعيد عن المرضى.
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            تسجيل إجازة جديدة
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <form
          action={addAction}
          className="p-5 bg-white dark:bg-slate-900 border-2 border-teal-500/50 rounded-2xl space-y-4 shadow-lg"
        >
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          {doctorId && <input type="hidden" name="doctorId" value={doctorId} />}

          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-teal-600" />
              تسجيل فترة إجازة / إغلاق
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!addState?.ok && addState?.messageAr && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {addState.messageAr}
            </div>
          )}

          {isConflict && isAdmin && doctorId && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-xl space-y-2 text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                توجد مواعيد محجوزة في هذه الفترة. كمدير للنظام، يمكنك فرض الإجازة وإلغاء المواعيد المتعارضة مع إرسال إشعارات اعتذار للمرضى.
              </p>
              <button
                type="button"
                onClick={() => setShowForceModal(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold"
              >
                المتابعة كإلغاء إداري قسري
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                بداية الإجازة (بتوقيت القاهرة)
              </label>
              <input
                type="datetime-local"
                defaultValue={defaultStart}
                onChange={(e) => {
                  const target = document.getElementById("timeoff_startsAtUTC") as HTMLInputElement;
                  const utc = cairoDateTimeLocalToUtc(e.target.value);
                  if (target && utc) target.value = utc.toISOString();
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold"
                required
              />
              <input
                type="hidden"
                id="timeoff_startsAtUTC"
                name="startsAtUTC"
                defaultValue={cairoDateTimeLocalToUtc(defaultStart)?.toISOString()}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نهاية الإجازة (بتوقيت القاهرة)
              </label>
              <input
                type="datetime-local"
                defaultValue={defaultEnd}
                onChange={(e) => {
                  const target = document.getElementById("timeoff_endsAtUTC") as HTMLInputElement;
                  const utc = cairoDateTimeLocalToUtc(e.target.value);
                  if (target && utc) target.value = utc.toISOString();
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold"
                required
              />
              <input
                type="hidden"
                id="timeoff_endsAtUTC"
                name="endsAtUTC"
                defaultValue={cairoDateTimeLocalToUtc(defaultEnd)?.toISOString()}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              السبب (اختياري / للعلم الداخلي)
            </label>
            <input
              type="text"
              name="reason"
              placeholder="مثال: مؤتمر الجمعية النفسية، إجازة سنوية، إلخ..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isAddPending}
              className="inline-flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {isAddPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              حفظ الإجازة
            </button>
          </div>
        </form>
      )}

      {/* Force Time Off Modal for Admin Escalation */}
      {showForceModal && doctorId && (
        <form
          action={forceAction}
          className="p-5 bg-amber-50/90 dark:bg-slate-900 border-2 border-amber-500 rounded-2xl space-y-4 shadow-xl"
        >
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <input type="hidden" name="doctorId" value={doctorId} />
          <input
            type="hidden"
            name="startsAtUTC"
            value={cairoDateTimeLocalToUtc(defaultStart)?.toISOString()}
          />
          <input
            type="hidden"
            name="endsAtUTC"
            value={cairoDateTimeLocalToUtc(defaultEnd)?.toISOString()}
          />
          <input type="hidden" name="cancelConflicts" value="true" />

          <div className="flex items-center justify-between border-b border-amber-200 dark:border-slate-700 pb-3">
            <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              تأكيد الإجازة القسرية وإلغاء الحجوزات المتعارضة
            </h4>
            <button
              type="button"
              onClick={() => setShowForceModal(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              رسالة سبب الإلغاء للمرضى المتأثرين (ستصلهم بالواتساب)
            </label>
            <textarea
              name="cancellationReason"
              rows={3}
              required
              defaultValue="ظرف طارئ للعيادة يستلزم إلغاء الموعد. نعتذر بشدة وسيتم تسوية حجزكم فوراً."
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-amber-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowForceModal(false)}
              className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl"
            >
              تراجع
            </button>
            <button
              type="submit"
              disabled={isForcePending}
              className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {isForcePending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              تأكيد الإلغاء وحجب المواعيد
            </button>
          </div>
        </form>
      )}

      {/* Force Time Off Result WhatsApp links display */}
      {forceState?.ok && forceState.data.cancelledAppointments.length > 0 && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-2xl space-y-3">
          <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            تم تسجيل الإجازة وإلغاء {forceState.data.cancelledAppointments.length} حجز. يرجى إرسال رسائل الاعتذار للمرضى:
          </h4>
          <div className="space-y-2">
            {forceState.data.cancelledAppointments.map((c) => (
              <div
                key={c.appointmentId}
                className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl text-xs border border-emerald-100 dark:border-emerald-900"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{c.patientName}</span>
                  <span className="text-slate-400 font-mono mr-2">{c.patientPhone}</span>
                </div>
                <a
                  href={c.whatsappCancelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  إرسال واتساب
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time-off List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {timeOff.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
            <CalendarOff className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">لا توجد إجازات أو فترات إغلاق مسجلة.</p>
          </div>
        ) : (
          timeOff.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  {formatCairo(new Date(item.startsAtUTC))}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  إلى: {formatCairo(new Date(item.endsAtUTC))}
                </div>
                {item.reason && (
                  <p className="text-xs text-slate-500 mt-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded inline-block">
                    {item.reason}
                  </p>
                )}
              </div>

              <form action={cancelAction}>
                <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                <input type="hidden" name="exceptionId" value={item.id} />
                {doctorId && <input type="hidden" name="doctorId" value={doctorId} />}
                <button
                  type="submit"
                  disabled={isCancelPending}
                  title="إلغاء الإجازة وفتح المواعيد"
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
