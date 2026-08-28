"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarClock,
  Clock,
  ExternalLink,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import type { ReschedulePayload } from "@/app/actions/doctor.actions";
import { rescheduleAppointmentAction } from "@/app/actions/doctor.actions";
import { getAvailableSlotsAction, type SlotView } from "@/app/actions/booking.actions";
import { CSRF_FIELD } from "@/lib/constants";
import { formatCairo } from "@/lib/whatsapp";

interface Props {
  appointmentId: string;
  patientName: string;
  doctorId: string;
  type: "ONLINE" | "OFFLINE";
  durationMinutes: number;
  currentScheduledAtUTC: string;
  csrfToken: string;
  isAdmin?: boolean;
  onClose: () => void;
}

interface FormattedSlot {
  startUTC: string;
  endUTC: string;
  durationMinutes: number;
  timeLabel: string;
  dateCairo: string;
}

export function RescheduleDialog({
  appointmentId,
  patientName,
  doctorId,
  type,
  durationMinutes,
  currentScheduledAtUTC,
  csrfToken,
  isAdmin = false,
  onClose,
}: Props) {
  const router = useRouter();

  // Slots fetching state
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<FormattedSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<FormattedSlot | null>(null);

  const [state, formAction, isPending] = useActionState(rescheduleAppointmentAction, null);

  useEffect(() => {
    async function loadSlots() {
      setIsLoadingSlots(true);
      const res = await getAvailableSlotsAction({
        doctorId,
        type,
        days: 14,
      });
      setIsLoadingSlots(false);
      if (res.ok) {
        const dateFormatter = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Cairo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const timeFormatter = new Intl.DateTimeFormat("ar-EG", {
          timeZone: "Africa/Cairo",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        const formatted = res.data.slots.map((s) => {
          const dateObj = new Date(s.startUTC);
          return {
            startUTC: s.startUTC,
            endUTC: s.endUTC,
            durationMinutes: s.durationMinutes,
            dateCairo: dateFormatter.format(dateObj),
            timeLabel: timeFormatter.format(dateObj),
          };
        });

        setAvailableSlots(formatted);
      }
    }
    loadSlots();
  }, [doctorId, type]);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  // Group slots by Cairo local date (YYYY-MM-DD)
  const groupedSlots = availableSlots.reduce<Record<string, FormattedSlot[]>>((acc, slot) => {
    const key = slot.dateCairo;
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

  const availableDays = Object.keys(groupedSlots).sort();
  const currentDaySlots = selectedDay ? groupedSlots[selectedDay] || [] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-teal-600" />
              إعادة جدولة موعد الجلسة
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              المريض: <strong className="text-slate-800 dark:text-slate-200">{patientName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current scheduled time */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs flex items-center justify-between">
          <span className="text-slate-500">الموعد الحالي:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {formatCairo(new Date(currentScheduledAtUTC))}
          </span>
        </div>

        {/* Success message with WhatsApp button */}
        {state?.ok ? (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-2xl space-y-3 text-center">
            <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
              تم تعديل موعد الجلسة بنجاح!
            </h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              الموعد الجديد: {formatCairo(new Date(state.data.newScheduledAtUTC))}
            </p>
            <a
              href={state.data.whatsappRescheduleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              إرسال إشعار التعديل للمريض عبر واتساب
            </a>
            <div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 text-xs text-slate-500 hover:underline font-semibold"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <input type="hidden" name="appointmentId" value={appointmentId} />
            <input type="hidden" name="durationMinutes" value={durationMinutes} />
            <input
              type="hidden"
              name="scheduledAtUTC"
              value={selectedSlot?.startUTC ?? ""}
            />

            {!state?.ok && state?.messageAr && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {state.messageAr}
              </div>
            )}

            {/* Step 1: Select Day */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                ١. اختر اليوم الجديد
              </label>
              {isLoadingSlots ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin inline ml-1" />
                  جاري تحميل المواعيد المتاحة...
                </div>
              ) : availableDays.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  لا توجد فترات عمل متاحة في الـ 14 يوماً القادمة لهذا الطبيب.
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {availableDays.map((day) => {
                    const isSelected = selectedDay === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day);
                          setSelectedSlot(null);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 border transition ${
                          isSelected
                            ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500"
                        }`}
                      >
                        {new Date(day).toLocaleDateString("ar-EG", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Select Slot Instant */}
            {selectedDay && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  ٢. اختر الساعة المناسبة
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {currentDaySlots.map((slot) => {
                    const isSelected = selectedSlot?.startUTC === slot.startUTC;
                    return (
                      <button
                        key={slot.startUTC}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2 rounded-xl text-xs font-mono font-bold border text-center transition ${
                          isSelected
                            ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-500"
                        }`}
                      >
                        {slot.timeLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                سبب إعادة الجدولة (اختياري / يُرسل للمريض)
              </label>
              <input
                type="text"
                name="reason"
                placeholder="مثال: بناءً على طلب المريض، ظرف طارئ..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            {isAdmin && (
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  name="allowOffGrid"
                  value="true"
                  className="rounded border-slate-300 text-teal-600 w-4 h-4"
                />
                استثناء إداري: السماح بموعد خارج الجدول المنشور (Off-grid)
              </label>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={!selectedSlot || isPending}
                className="inline-flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 shadow-sm"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                تأكيد الموعد الجديد
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
