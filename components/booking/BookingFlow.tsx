"use client";

import React, { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  MapPin,
  Video,
  Wallet,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { DoctorCardView } from "@/app/actions/doctors.actions";
import {
  getAvailableSlotsAction,
  reserveSlotAction,
  type ReservationPayload,
} from "@/app/actions/booking.actions";
import type { BookableSlot } from "@/lib/slots";
import type { ActionResult } from "@/lib/result";
import type { AppointmentType } from "@/lib/domain/enums";
import { CSRF_FIELD } from "@/lib/constants";
import { formatEgp } from "@/lib/whatsapp";

/**
 * Booking flow — slot selection through to a held reservation or credit-covered confirmation.
 */

interface Props {
  doctor: DoctorCardView;
  csrfToken: string;
  isAuthenticated: boolean;
  holdMinutes: number;
  creditBalanceEGP?: number | null;
}

const initialReservation: ActionResult<ReservationPayload> | null = null;

/** Cairo-local day key, so slots group the way a patient reads a calendar. */
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatDayHeading(iso: string, isAr: boolean): string {
  return new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

function formatTime(iso: string, isAr: boolean): string {
  return new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function BookingFlow({
  doctor,
  csrfToken,
  isAuthenticated,
  holdMinutes,
  creditBalanceEGP,
}: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  const availableTypes = useMemo(() => {
    const types: AppointmentType[] = [];
    if (doctor.offersOnline) types.push("ONLINE");
    if (doctor.offersOffline) types.push("OFFLINE");
    return types;
  }, [doctor.offersOnline, doctor.offersOffline]);

  const [type, setType] = useState<AppointmentType>(availableTypes[0] ?? "ONLINE");
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [loadingSlots, startLoadingSlots] = useTransition();
  const [slotError, setSlotError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookableSlot | null>(null);
  const [useCredit, setUseCredit] = useState(false);

  const [reservation, reserveFormAction, reserving] = useActionState(
    reserveSlotAction,
    initialReservation,
  );

  const price = type === "ONLINE" ? doctor.priceOnlineEGP : doctor.priceOfflineEGP;
  const hasCredit = typeof creditBalanceEGP === "number" && creditBalanceEGP > 0;
  const isCreditSufficient = hasCredit && creditBalanceEGP >= price;

  // Auto-disable useCredit if price exceeds credit balance upon type change
  useEffect(() => {
    if (!isCreditSufficient) {
      setUseCredit(false);
    }
  }, [isCreditSufficient]);

  // Re-fetch on every type change: online and in-clinic are separate calendars.
  useEffect(() => {
    setSelectedSlot(null);
    setSlotError(null);

    startLoadingSlots(async () => {
      const result = await getAvailableSlotsAction({ doctorId: doctor.id, type });
      if (result.ok) {
        setSlots(result.data.slots);
      } else {
        setSlots([]);
        setSlotError(isAr ? result.messageAr : result.messageEn);
      }
    });
  }, [doctor.id, type, isAr]);

  // Handle post-reservation routing
  useEffect(() => {
    if (reservation?.ok) {
      if (reservation.data.isCreditApplied || reservation.data.holdExpiresAtUTC === null) {
        router.push(
          `/dashboard/patient?booked=true&appointmentId=${reservation.data.appointmentId}&credit=true&type=${reservation.data.type}`,
        );
      } else {
        router.push(`/payment/${reservation.data.appointmentId}`);
      }
    }
  }, [reservation, router]);

  const slotsByDay = useMemo(() => {
    const grouped = new Map<string, BookableSlot[]>();
    for (const slot of slots) {
      const key = dayKeyFormatter.format(new Date(slot.startUTC));
      const bucket = grouped.get(key);
      if (bucket) bucket.push(slot);
      else grouped.set(key, [slot]);
    }
    return [...grouped.entries()];
  }, [slots]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ---------------------------------------------------------- left ---- */}
      <div className="lg:col-span-7 space-y-5">
        {/* 1. Consultation type */}
        <section className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-4">
          <h2 className="font-extrabold text-sm text-teal-950 flex items-center gap-2">
            <span className="w-5 h-5 rounded-lg bg-teal-800 text-white text-[10px] font-black flex items-center justify-center">
              1
            </span>
            {isAr ? "نوع الاستشارة" : "Consultation type"}
          </h2>

          {availableTypes.length === 0 ? (
            <p className="text-xs text-gray-500">
              {isAr
                ? "لا توجد مواعيد منشورة لهذا الطبيب حالياً."
                : "This doctor has no published availability at the moment."}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableTypes.map((option) => {
                const active = type === option;
                const Icon = option === "ONLINE" ? Video : Building2;
                const optionPrice =
                  option === "ONLINE" ? doctor.priceOnlineEGP : doctor.priceOfflineEGP;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setType(option)}
                    aria-pressed={active}
                    className={`p-4 rounded-2xl border text-start transition flex flex-col gap-1.5 ${
                      active
                        ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-extrabold text-xs">
                      <Icon className="w-4 h-4" />
                      {option === "ONLINE"
                        ? isAr ? "جلسة أونلاين" : "Online session"
                        : isAr ? "زيارة بالعيادة" : "In-clinic visit"}
                    </span>
                    <span className={`text-[11px] ${active ? "text-teal-200" : "text-gray-500"}`}>
                      {option === "ONLINE"
                        ? isAr ? "عبر رابط زووم مشفّر" : "Via a private Zoom link"
                        : isAr
                          ? `حضورياً${doctor.roomNumber ? ` — غرفة ${doctor.roomNumber}` : ""}`
                          : `In person${doctor.roomNumber ? ` — room ${doctor.roomNumber}` : ""}`}
                    </span>
                    <span className={`text-sm font-black ${active ? "text-white" : "text-teal-900"}`}>
                      {formatEgp(optionPrice, isAr ? "ar" : "en")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Slot picker */}
        <section className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-extrabold text-sm text-teal-950 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-teal-800 text-white text-[10px] font-black flex items-center justify-center">
                2
              </span>
              {isAr ? "اختر الموعد" : "Choose a time"}
            </h2>
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {isAr ? "بتوقيت القاهرة" : "Cairo time"}
            </span>
          </div>

          {loadingSlots ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              {isAr ? "جارٍ تحميل المواعيد المتاحة…" : "Loading available times…"}
            </div>
          ) : slotError ? (
            <p className="p-4 rounded-2xl bg-crisis-light border border-crisis/20 text-xs font-bold text-crisis-dark">
              {slotError}
            </p>
          ) : slotsByDay.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-500">
              {isAr
                ? "لا توجد مواعيد متاحة في الفترة القادمة. جرّب نوع استشارة آخر أو تواصل مع المركز."
                : "No times available in the coming period. Try the other consultation type or contact the clinic."}
            </p>
          ) : (
            <div className="space-y-4 max-h-[420px] overflow-y-auto pe-1">
              {slotsByDay.map(([dayKey, daySlots]) => (
                <div key={dayKey} className="space-y-2">
                  <h3 className="text-[11px] font-extrabold text-sage-800 sticky top-0 bg-white py-1">
                    {formatDayHeading(daySlots[0]!.startUTC, isAr)}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {daySlots.map((slot) => {
                      const active = selectedSlot?.startUTC === slot.startUTC;
                      return (
                        <button
                          key={slot.startUTC}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          aria-pressed={active}
                          className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition ${
                            active
                              ? "bg-sage-600 text-white border-sage-600 shadow-sm"
                              : "bg-alabaster-base text-gray-700 border-alabaster-border hover:border-sage-400"
                          }`}
                        >
                          {formatTime(slot.startUTC, isAr)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* --------------------------------------------------------- right ---- */}
      <aside className="lg:col-span-5">
        <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-5 lg:sticky lg:top-24">
          <h2 className="font-extrabold text-sm text-teal-950">
            {isAr ? "ملخص الحجز" : "Booking summary"}
          </h2>

          <dl className="space-y-2.5 text-xs">
            <Row label={isAr ? "الطبيب" : "Doctor"} value={doctor.fullName} />
            <Row
              label={isAr ? "نوع الجلسة" : "Session type"}
              value={
                type === "ONLINE"
                  ? isAr ? "أونلاين عبر زووم" : "Online via Zoom"
                  : isAr ? "حضورية بالعيادة" : "In-clinic"
              }
            />
            <Row
              label={isAr ? "الموعد" : "Time"}
              value={
                selectedSlot
                  ? `${formatDayHeading(selectedSlot.startUTC, isAr)} — ${formatTime(selectedSlot.startUTC, isAr)}`
                  : isAr ? "لم يُختر بعد" : "Not selected yet"
              }
              muted={!selectedSlot}
            />
            <Row
              label={isAr ? "مدة الجلسة" : "Duration"}
              value={`${selectedSlot?.durationMinutes ?? doctor.defaultDurationMins} ${isAr ? "دقيقة" : "min"}`}
            />
          </dl>

          {/* Credit Payment Option */}
          {isAuthenticated && hasCredit && (
            <div className="space-y-2 pt-2 border-t border-alabaster-border">
              {isCreditSufficient ? (
                <div
                  className={`p-4 rounded-2xl border transition ${
                    useCredit
                      ? "bg-teal-50/90 border-teal-600 ring-1 ring-teal-600 shadow-sm"
                      : "bg-alabaster-base border-alabaster-border hover:border-teal-400"
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useCredit}
                      onChange={(e) => setUseCredit(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-teal-800 focus:ring-teal-700 accent-teal-800 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-teal-800" />
                        {isAr ? "استخدام رصيدي المالي لدى المركز" : "Use my clinic credit balance"}
                      </span>
                      <p className="text-[11px] text-teal-900 leading-snug">
                        {isAr
                          ? `رصيدك ${formatEgp(creditBalanceEGP, "ar")} — بعد الحجز يتبقى ${formatEgp(creditBalanceEGP - price, "ar")}`
                          : `Your credit is ${formatEgp(creditBalanceEGP, "en")} — Remaining after booking: ${formatEgp(creditBalanceEGP - price, "en")}`}
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">
                      {isAr ? "رصيدك الحالي لا يغطي قيمة هذه الجلسة" : "Your current balance is insufficient"}
                    </span>
                    <span>
                      {isAr
                        ? `رصيدك المتاح هو ${formatEgp(creditBalanceEGP, "ar")} بينما قيمة الجلسة ${formatEgp(price, "ar")}. ${
                            type === "OFFLINE" && doctor.offersOnline && creditBalanceEGP >= doctor.priceOnlineEGP
                              ? "يمكنك استخدامه في جلسة أونلاين."
                              : ""
                          }`
                        : `Your available balance is ${formatEgp(creditBalanceEGP, "en")} while this session fee is ${formatEgp(price, "en")}. ${
                            type === "OFFLINE" && doctor.offersOnline && creditBalanceEGP >= doctor.priceOnlineEGP
                              ? "You can use it for an online session."
                              : ""
                          }`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-alabaster-border">
            <span className="text-xs font-bold text-gray-600">
              {isAr ? "الإجمالي المستحق" : "Total due"}
            </span>
            {useCredit ? (
              <div className="text-end">
                <span className="text-xs line-through text-gray-400 block">
                  {formatEgp(price, isAr ? "ar" : "en")}
                </span>
                <span className="text-sm font-black text-emerald-800">
                  {isAr ? "٠ ج.م (مغطى بالرصيد)" : "0 EGP (Covered by credit)"}
                </span>
              </div>
            ) : (
              <span className="text-xl font-black text-teal-900">
                {formatEgp(price, isAr ? "ar" : "en")}
              </span>
            )}
          </div>

          {reservation && !reservation.ok && (
            <p
              role="alert"
              className="p-3.5 rounded-2xl bg-crisis-light border border-crisis/20 text-xs font-bold text-crisis-dark flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{isAr ? reservation.messageAr : reservation.messageEn}</span>
            </p>
          )}

          {isAuthenticated ? (
            <form action={reserveFormAction} className="space-y-3">
              <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
              <input type="hidden" name="doctorId" value={doctor.id} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="scheduledAtUTC" value={selectedSlot?.startUTC ?? ""} />
              <input
                type="hidden"
                name="durationMinutes"
                value={selectedSlot?.durationMinutes ?? doctor.defaultDurationMins}
              />
              <input type="hidden" name="applyCredit" value={useCredit ? "true" : "false"} />

              <button
                type="submit"
                disabled={!selectedSlot || reserving || !doctor.isAcceptingPatients}
                className={`w-full py-3.5 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm transition flex items-center justify-center gap-2 ${
                  useCredit
                    ? "bg-teal-800 hover:bg-teal-900 shadow-sm"
                    : "bg-terracotta-600 hover:bg-terracotta-700"
                }`}
              >
                {reserving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {useCredit
                  ? isAr ? "أكّد الحجز من رصيدك" : "Confirm using your credit"
                  : isAr ? "احجز الموعد وتابع للدفع" : "Hold this time & continue"}
              </button>
            </form>
          ) : (
            <a
              href={`/login?next=${encodeURIComponent(`/booking/${doctor.id}`)}`}
              className="w-full py-3.5 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-sm transition flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {isAr ? "سجّل الدخول لإتمام الحجز" : "Sign in to book"}
            </a>
          )}

          {useCredit ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <p className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                {isAr ? "ماذا يحدث بعد الحجز؟" : "What happens next?"}
              </p>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                {type === "OFFLINE"
                  ? isAr
                    ? "يتم تأكيد الحجز فوراً وخصم المبلغ من رصيدك. ستجد تفاصيل الموعد والغرفة في لوحة تحكمك."
                    : "Your in-clinic booking is confirmed immediately and deducted from your credit balance."
                  : isAr
                    ? "تم خصم قيمة الجلسة من رصيدك بالكامل. سيصلك رابط زووم من فريق المركز خلال وقت قصير قبل موعد الجلسة."
                    : "Session fee deducted from your credit balance in full. The clinic team will send you the Zoom link shortly before your appointment."}
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-alabaster-base border border-alabaster-border space-y-1.5">
              <p className="text-[11px] font-bold text-teal-950 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sage-700" />
                {isAr ? "ماذا يحدث بعد الحجز؟" : "What happens next?"}
              </p>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                {isAr
                  ? `يُحجز الموعد باسمك لمدة ${holdMinutes} دقيقة، وتظهر لك بيانات التحويل عبر إنستا باي أو فودافون كاش. بعد رفع صورة الإيصال يراجعها فريق المركز ويؤكد الحجز.`
                  : `The time is held in your name for ${holdMinutes} minutes while you transfer via InstaPay or Vodafone Cash. Upload the receipt and the clinic confirms your booking.`}
              </p>
            </div>
          )}

          {type === "OFFLINE" && (
            <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sage-700" />
              {isAr
                ? "ستصلك تفاصيل العنوان ورقم الغرفة فور اعتماد الدفع."
                : "The address and room number are sent once your payment is approved."}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className={`font-bold text-end ${muted ? "text-gray-400" : "text-gray-900"}`}>{value}</dd>
    </div>
  );
}
