"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Upload,
  Video,
  XCircle,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  cancelMyAppointmentAction,
  type PatientAppointmentView,
} from "@/app/actions/booking.actions";
import type { ActionResult } from "@/lib/result";
import { APPOINTMENT_STATUS_LABELS, CSRF_FIELD } from "@/lib/constants";
import { formatCairo, formatEgp } from "@/lib/whatsapp";
import { PatientRescheduleModal } from "@/components/patient/PatientRescheduleModal";

/**
 * The patient's bookings.
 *
 * Every row is a real appointment row from the database, and the actions offered
 * on it come from the server (`canUploadProof`, `canCancel`, `canReschedule`) rather than being
 * re-derived here.
 */

interface Props {
  appointments: PatientAppointmentView[];
  csrfToken: string;
  clinicAddressAr: string;
  clinicMapsUrl: string;
}

const STATUS_TONE: Record<string, string> = {
  PENDING_PAYMENT_PROOF: "bg-amber-50 text-amber-900 border-amber-200",
  PAYMENT_UNDER_REVIEW: "bg-teal-50 text-teal-900 border-teal-200",
  CONFIRMED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  COMPLETED: "bg-alabaster-muted text-gray-700 border-alabaster-border",
  CANCELLED: "bg-crisis-light text-crisis-dark border-crisis/20",
  REJECTED: "bg-crisis-light text-crisis-dark border-crisis/20",
  EXPIRED: "bg-alabaster-muted text-gray-600 border-alabaster-border",
};

export function PatientAppointments({
  appointments,
  csrfToken,
  clinicAddressAr,
  clinicMapsUrl,
}: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  const now = Date.now();
  const upcoming = appointments.filter(
    (item) =>
      new Date(item.scheduledAtUTC).getTime() >= now &&
      !["CANCELLED", "EXPIRED", "COMPLETED"].includes(item.status),
  );
  const past = appointments.filter((item) => !upcoming.includes(item));

  const [tab, setTab] = useState<"UPCOMING" | "PAST">("UPCOMING");
  const rows = tab === "UPCOMING" ? upcoming : past;

  const [reschedulingAppointment, setReschedulingAppointment] = useState<PatientAppointmentView | null>(null);

  const [cancelState, cancelFormAction, cancelling] = useActionState(
    cancelMyAppointmentAction,
    null as ActionResult<{ appointmentId: string }> | null,
  );

  useEffect(() => {
    if (cancelState?.ok) router.refresh();
  }, [cancelState, router]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {(
          [
            { id: "UPCOMING" as const, ar: "المواعيد القادمة", en: "Upcoming", count: upcoming.length },
            { id: "PAST" as const, ar: "السجل السابق", en: "History", count: past.length },
          ]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center gap-2 ${
              tab === item.id
                ? "bg-teal-800 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {isAr ? item.ar : item.en}
            {item.count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                  tab === item.id ? "bg-white/20" : "bg-alabaster-muted text-gray-700"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {cancelState && !cancelState.ok && (
        <p
          role="alert"
          className="p-3.5 rounded-2xl bg-crisis-light border border-crisis/20 text-xs font-bold text-crisis-dark flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{isAr ? cancelState.messageAr : cancelState.messageEn}</span>
        </p>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-3xl border border-alabaster-border p-12 text-center space-y-3">
          <CalendarClock className="w-10 h-10 text-gray-300 mx-auto" />
          <p className="text-sm font-bold text-teal-950">
            {tab === "UPCOMING"
              ? isAr ? "لا توجد مواعيد قادمة" : "No upcoming appointments"
              : isAr ? "لا يوجد سجل سابق" : "No past appointments"}
          </p>
          {tab === "UPCOMING" && (
            <Link
              href="/therapists"
              className="inline-block px-6 py-3 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-extrabold transition"
            >
              {isAr ? "احجز جلستك الأولى" : "Book your first session"}
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((appointment) => {
            const label = APPOINTMENT_STATUS_LABELS[appointment.status];
            const isOnline = appointment.type === "ONLINE";

            return (
              <li
                key={appointment.id}
                className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm text-teal-950">
                        {appointment.doctorName}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-bold ${
                          STATUS_TONE[appointment.status] ?? STATUS_TONE.COMPLETED
                        }`}
                      >
                        {isAr ? label.ar : label.en}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-alabaster-muted text-[10px] font-bold text-gray-700 flex items-center gap-1">
                        {isOnline ? <Video className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                        {isOnline
                          ? isAr ? "أونلاين" : "Online"
                          : isAr ? "بالعيادة" : "In-clinic"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{appointment.doctorTitle}</p>
                    <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5 pt-0.5">
                      <CalendarClock className="w-3.5 h-3.5 text-sage-700" />
                      {formatCairo(new Date(appointment.scheduledAtUTC), language)}
                      <span className="text-gray-400 font-medium">
                        · {appointment.durationMinutes} {isAr ? "دقيقة" : "min"}
                      </span>
                    </p>
                  </div>

                  <span className="text-base font-black text-teal-900 shrink-0">
                    {formatEgp(appointment.priceEGP, language)}
                  </span>
                </div>

                {appointment.latestRejectionReason && (
                  <p className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      <strong>{isAr ? "سبب رفض الإيصال: " : "Receipt rejected: "}</strong>
                      {appointment.latestRejectionReason}
                    </span>
                  </p>
                )}

                {appointment.status === "CONFIRMED" && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <p className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isAr ? "حجزك مؤكد" : "Your booking is confirmed"}
                    </p>
                    {isOnline ? (
                      appointment.zoomMeetingUrl && (
                        <div className="space-y-1.5">
                          <a
                            href={appointment.zoomMeetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-extrabold transition"
                          >
                            <Video className="w-3.5 h-3.5" />
                            {isAr ? "الدخول إلى جلسة زووم" : "Join the Zoom session"}
                          </a>
                          {appointment.zoomPasscode && (
                            <p className="text-[11px] text-emerald-900" dir="ltr">
                              {isAr ? "كلمة المرور: " : "Passcode: "}
                              <span className="font-mono font-bold">{appointment.zoomPasscode}</span>
                            </p>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="space-y-1.5 text-[11px] text-emerald-900">
                        <p className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            {clinicAddressAr}
                            {appointment.roomNumber
                              ? ` — ${isAr ? "غرفة" : "Room"} ${appointment.roomNumber}`
                              : ""}
                          </span>
                        </p>
                        <a
                          href={clinicMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sage-600 hover:bg-sage-700 text-white font-extrabold transition"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          {isAr ? "فتح الموقع على الخريطة" : "Open in maps"}
                        </a>
                      </div>
                    )}
                    {appointment.clinicNotes && (
                      <p className="text-[11px] text-emerald-900 leading-relaxed">
                        {appointment.clinicNotes}
                      </p>
                    )}
                  </div>
                )}

                {appointment.status === "PAYMENT_UNDER_REVIEW" && (
                  <p className="p-3 rounded-2xl bg-teal-50 border border-teal-100 text-[11px] text-teal-900 flex items-center gap-2">
                    <Clock3 className="w-3.5 h-3.5" />
                    {isAr
                      ? "إيصالك قيد المراجعة — سيصلك التأكيد على واتساب."
                      : "Your receipt is under review — confirmation will arrive on WhatsApp."}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {appointment.canUploadProof && (
                    <Link
                      href={`/payment/${appointment.id}`}
                      className="px-4 py-2 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-[11px] font-extrabold transition flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {isAr ? "رفع إيصال الدفع" : "Upload payment receipt"}
                    </Link>
                  )}

                  {appointment.canReschedule && (
                    <button
                      type="button"
                      onClick={() => setReschedulingAppointment(appointment)}
                      className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-extrabold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      {isAr ? "تغيير الموعد" : "Reschedule"}
                    </button>
                  )}

                  {appointment.canCancel && (
                    <form action={cancelFormAction}>
                      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                      <input type="hidden" name="appointmentId" value={appointment.id} />
                      <button
                        type="submit"
                        disabled={cancelling}
                        className="px-4 py-2 rounded-xl border border-crisis/30 text-crisis-dark hover:bg-crisis-light disabled:opacity-60 text-[11px] font-extrabold transition flex items-center gap-1.5"
                      >
                        {cancelling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {isAr ? "إلغاء الحجز" : "Cancel booking"}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {reschedulingAppointment && (
        <PatientRescheduleModal
          appointment={reschedulingAppointment}
          csrfToken={csrfToken}
          onClose={() => {
            setReschedulingAppointment(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
