"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Calendar,
  CalendarClock,
  Clock,
  ExternalLink,
  MessageCircle,
  ShieldAlert,
  X,
} from "lucide-react";
import { formatCairo } from "@/lib/whatsapp";
import {
  getAvailableSlotsAction,
  patientRescheduleAppointmentAction,
  type SlotView,
} from "@/app/actions/booking.actions";

interface Props {
  appointment: {
    id: string;
    doctorId: string;
    doctorName: string;
    type: "ONLINE" | "OFFLINE";
    scheduledAtUTC: string;
    durationMinutes: number;
  };
  csrfToken: string;
  onClose: () => void;
}

export function PatientRescheduleModal({ appointment, csrfToken, onClose }: Props) {
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [days, setDays] = useState<{ dateCairo: string; slots: SlotView[] }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotView | null>(null);

  const [state, action, isPending] = useActionState(patientRescheduleAppointmentAction, null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingSlots(true);
      try {
        const res = await getAvailableSlotsAction({
          doctorId: appointment.doctorId,
          type: appointment.type,
          days: 14,
        });
        if (active && res.ok) {
          const dateFmt = new Intl.DateTimeFormat("ar-EG", {
            timeZone: "Africa/Cairo",
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          const timeFmt = new Intl.DateTimeFormat("ar-EG", {
            timeZone: "Africa/Cairo",
            hour: "numeric",
            minute: "2-digit",
          });

          // Group slots by dateCairo
          const map = new Map<string, SlotView[]>();
          for (const s of res.data.slots) {
            const dateObj = new Date(s.startUTC);
            const dateCairo = dateFmt.format(dateObj);
            const timeLabel = timeFmt.format(dateObj);
            const list = map.get(dateCairo) ?? [];
            list.push({
              startUTC: s.startUTC,
              endUTC: s.endUTC,
              durationMinutes: s.durationMinutes,
              timeLabel,
              dateCairo,
            });
            map.set(dateCairo, list);
          }
          const grouped = Array.from(map.entries()).map(([dateCairo, slots]) => ({
            dateCairo,
            slots,
          }));
          setDays(grouped);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingSlots(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [appointment.doctorId, appointment.type]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-800 border border-teal-100">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">تغيير موعد الجلسة</h3>
              <p className="text-[10px] text-slate-400">مع الاستشاري: {appointment.doctorName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Time Info */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
          <span className="text-slate-500 text-[10px]">الموعد الحالي المحجوز:</span>
          <div className="font-bold text-slate-900">
            {formatCairo(new Date(appointment.scheduledAtUTC))}
          </div>
          <p className="text-[10px] text-amber-800 font-semibold pt-0.5">
            تنبيه: يمكنك إعادة جدولة الموعد ذاتياً لمرة واحدة قبل 24 ساعة على الأقل من موعد الجلسة.
          </p>
        </div>

        {/* State Success View */}
        {state && state.ok ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-center">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CalendarClock className="w-5 h-5" />
            </div>
            <h4 className="font-black text-sm text-emerald-900">تم تغيير موعد جلستك بنجاح!</h4>
            <p className="text-xs text-emerald-800">
              تم تحديث السجل في النظام. يمكنك إرسال تأكيد الموعد الجديد إلى رقمك عبر واتساب.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href={state.data.whatsappRescheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                إرسال تفاصيل الموعد للواتساب
              </a>
              <button
                type="button"
                onClick={onClose}
                className="py-2 bg-white border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <>
            {state && !state.ok && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{state.messageAr}</span>
              </div>
            )}

            {/* Slots Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                اختر الموعد الجديد المناسب لك من جدول الطبيب:
              </label>

              {loadingSlots ? (
                <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                  جاري فحص المواعيد المتاحة...
                </div>
              ) : days.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-slate-200">
                  لا توجد فترات عمل شاغرة منشورة لهذا الطبيب خلال الـ 14 يوماً القادمة. يرجى التواصل مع المركز.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                  {days.map((d) => (
                    <div key={d.dateCairo} className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 block">
                        {d.dateCairo}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {d.slots.map((slot) => {
                          const isSelected = selectedSlot?.startUTC === slot.startUTC;
                          return (
                            <button
                              key={slot.startUTC}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                isSelected
                                  ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{slot.timeLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Action */}
            <form action={action} className="pt-2">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="appointmentId" value={appointment.id} />
              <input type="hidden" name="scheduledAtUTC" value={selectedSlot?.startUTC ?? ""} />
              <input type="hidden" name="durationMinutes" value={appointment.durationMinutes} />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!selectedSlot || isPending}
                  className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {isPending ? "جاري تغيير الموعد..." : "تأكيد الموعد الجديد"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
