"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { rescheduleAppointmentAction } from "@/app/actions/doctor.actions";
import { getAvailableSlotsAction } from "@/app/actions/booking.actions";
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
  const { language } = useLanguage();
  const isAr = language === "ar";
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
        const timeFormatter = new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-US", {
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
  }, [doctorId, type, isAr]);

  // Unique days list
  const availableDays = Array.from(new Set(availableSlots.map((s) => s.dateCairo))).sort();

  // Current day slots
  const currentDaySlots = availableSlots.filter((s) => s.dateCairo === selectedDay);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-start">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-teal-700" />
              <span>{isAr ? "إعادة جدولة موعد الجلسة" : "Reschedule Consultation"}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr ? "المريض: " : "Patient: "}<strong className="text-slate-800">{patientName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
            aria-label={isAr ? "إغلاق" : "Close"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current scheduled time */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
          <span className="text-slate-500">{isAr ? "الموعد الحالي:" : "Current Time:"}</span>
          <span className="font-bold text-slate-800">
            {formatCairo(new Date(currentScheduledAtUTC), isAr ? "ar" : "en")}
          </span>
        </div>

        {/* Success message with WhatsApp button */}
        {state?.ok ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-center">
            <h4 className="font-bold text-emerald-900 text-sm">
              {isAr ? "تم تعديل موعد الجلسة بنجاح!" : "Session rescheduled successfully!"}
            </h4>
            <p className="text-xs text-emerald-800">
              {isAr ? "الموعد الجديد: " : "New Time: "}
              <strong>{formatCairo(new Date(state.data.newScheduledAtUTC), isAr ? "ar" : "en")}</strong>
            </p>
            <a
              href={state.data.whatsappRescheduleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isAr ? "إرسال إشعار التعديل للمريض عبر واتساب" : "Send WhatsApp Update to Patient"}</span>
            </a>
            <div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 text-xs text-slate-500 hover:underline font-semibold"
              >
                {isAr ? "إغلاق النافذة" : "Close Window"}
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

            {!state?.ok && state && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {isAr ? state.messageAr : state.messageEn ?? state.messageAr}
              </div>
            )}

            {/* Step 1: Select Day */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {isAr ? "١. اختر اليوم الجديد" : "1. Select New Date"}
              </label>
              {isLoadingSlots ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin inline mx-1" />
                  <span>{isAr ? "جاري تحميل المواعيد المتاحة..." : "Loading available slots..."}</span>
                </div>
              ) : availableDays.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
                  {isAr
                    ? "لا توجد فترات عمل متاحة في الـ 14 يوماً القادمة لهذا الطبيب."
                    : "No available slots in the next 14 days for this consultant."}
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
                        className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 border transition ${
                          isSelected
                            ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-600 hover:bg-white"
                        }`}
                      >
                        {new Date(day).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
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
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {isAr ? "٢. اختر الساعة المناسبة" : "2. Select Time"}
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
                            ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                            : "bg-white text-slate-800 border-slate-200 hover:border-teal-600"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "سبب إعادة الجدولة (اختياري / يُرسل للمريض)" : "Reschedule Reason (Optional)"}
              </label>
              <input
                type="text"
                name="reason"
                placeholder={
                  isAr
                    ? "مثال: بناءً على طلب المريض، ظرف طارئ..."
                    : "e.g. Patient request, clinical adjustment..."
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>

            {isAdmin && (
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  name="allowOffGrid"
                  value="true"
                  className="rounded border-slate-300 text-teal-600 w-4 h-4"
                />
                <span>
                  {isAr
                    ? "استثناء إداري: السماح بموعد خارج الجدول المنشور (Off-grid)"
                    : "Admin override: Allow slot outside published schedule (Off-grid)"}
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={!selectedSlot || isPending}
                className="inline-flex items-center gap-2 px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 shadow-sm"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isAr ? "تأكيد الموعد الجديد" : "Confirm New Time"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
