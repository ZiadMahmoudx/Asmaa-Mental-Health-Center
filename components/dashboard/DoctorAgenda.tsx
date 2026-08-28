"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileSignature,
  Loader2,
  MessageCircle,
  Phone,
  Trash2,
  Video,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { AvailabilityRuleView, DoctorAgendaEntry } from "@/app/actions/doctor.actions";
import {
  addAvailabilityRuleAction,
  completeAppointmentAction,
  removeAvailabilityRuleAction,
  saveClinicalRecordAction,
} from "@/app/actions/doctor.actions";
import { APPOINTMENT_STATUS_LABELS, CSRF_FIELD, SESSION_DURATIONS } from "@/lib/constants";
import { formatCairo, formatEgp } from "@/lib/whatsapp";

/**
 * Consultant workspace: agenda, weekly availability, and session notes.
 *
 * Two things the previous version could not do, because it had no server:
 *
 *  - Availability is persisted. `toggleDoctorSlot` used to flip a boolean in
 *    component state that vanished on refresh; here a window is a row that the
 *    patient-facing calendar actually reads from.
 *
 *  - Notes are signed. Signing is one-way and enforced server-side: once a
 *    record carries `signedAt` the action refuses further edits, which is what
 *    makes it usable as the clinic's documentation of the session.
 *
 * Availability times are entered in Cairo local hours and converted to the UTC
 * minutes the schema stores. The conversion uses a fixed winter offset, matching
 * prisma/seed.ts — see docs/BACKEND.md for why UTC is held fixed across DST.
 */

interface Props {
  agenda: DoctorAgendaEntry[];
  availability: AvailabilityRuleView[];
  csrfToken: string;
}

const CAIRO_WINTER_OFFSET_HOURS = 2;

const DAY_NAMES_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** UTC minutes-from-midnight -> "HH:MM" on the Cairo winter clock. */
function utcMinutesToCairoLabel(minutes: number): string {
  const total = (minutes + CAIRO_WINTER_OFFSET_HOURS * 60 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "HH:MM" Cairo -> UTC minutes-from-midnight, for the hidden form fields. */
function cairoLabelToUtcMinutes(label: string): number {
  const [hours, mins] = label.split(":").map(Number);
  const total = ((hours ?? 0) - CAIRO_WINTER_OFFSET_HOURS) * 60 + (mins ?? 0);
  return ((total % 1440) + 1440) % 1440;
}

type Tab = "AGENDA" | "AVAILABILITY";

export function DoctorAgenda({ agenda, availability, csrfToken }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();
  const dayNames = isAr ? DAY_NAMES_AR : DAY_NAMES_EN;

  const [tab, setTab] = useState<Tab>("AGENDA");
  const [noteFor, setNoteFor] = useState<string | null>(null);

  const [noteState, noteAction, savingNote] = useActionState(saveClinicalRecordAction, null);
  const [completeState, completeAction, completing] = useActionState(
    completeAppointmentAction,
    null,
  );
  const [addState, addAction, adding] = useActionState(addAvailabilityRuleAction, null);
  const [removeState, removeAction, removing] = useActionState(
    removeAvailabilityRuleAction,
    null,
  );

  // Availability form state, so the hidden UTC fields track the visible inputs.
  const [startLabel, setStartLabel] = useState("17:00");
  const [endLabel, setEndLabel] = useState("21:00");

  useEffect(() => {
    if (noteState?.ok || completeState?.ok || addState?.ok || removeState?.ok) {
      setNoteFor(null);
      router.refresh();
    }
  }, [noteState, completeState, addState, removeState, router]);

  const errors = [noteState, completeState, addState, removeState].filter(
    (state) => state && !state.ok,
  );

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {(
          [
            { id: "AGENDA" as const, ar: "جدول الجلسات", en: "Session agenda" },
            { id: "AVAILABILITY" as const, ar: "مواعيد العمل", en: "Working hours" },
          ]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition ${
              tab === item.id
                ? "bg-teal-800 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {isAr ? item.ar : item.en}
          </button>
        ))}
      </div>

      {errors.map((state, index) =>
        state && !state.ok ? (
          <p
            key={index}
            role="alert"
            className="p-3.5 rounded-2xl bg-crisis-light border border-crisis/20 text-xs font-bold text-crisis-dark flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{isAr ? state.messageAr : state.messageEn}</span>
          </p>
        ) : null,
      )}

      {/* ------------------------------------------------------- agenda ---- */}
      {tab === "AGENDA" &&
        (agenda.length === 0 ? (
          <div className="bg-white rounded-3xl border border-alabaster-border p-12 text-center">
            <CalendarClock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-semibold">
              {isAr ? "لا توجد جلسات في هذه الفترة" : "No sessions in this period"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {agenda.map((entry) => {
              const label = APPOINTMENT_STATUS_LABELS[entry.status];
              const isPast = new Date(entry.scheduledAtUTC).getTime() < Date.now();

              return (
                <li
                  key={entry.appointmentId}
                  className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm text-teal-950">{entry.patientName}</h3>
                        <span className="px-2 py-0.5 rounded-lg bg-alabaster-muted text-[10px] font-bold text-gray-700 flex items-center gap-1">
                          {entry.type === "ONLINE" ? (
                            <Video className="w-3 h-3" />
                          ) : (
                            <Building2 className="w-3 h-3" />
                          )}
                          {entry.type === "ONLINE"
                            ? isAr ? "أونلاين" : "Online"
                            : isAr ? "بالعيادة" : "In-clinic"}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-100 text-[10px] font-bold">
                          {isAr ? label.ar : label.en}
                        </span>
                        {entry.clinicalRecordSigned && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            {isAr ? "تقرير موقّع" : "Note signed"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-sage-700" />
                        {formatCairo(new Date(entry.scheduledAtUTC))} · {entry.durationMinutes}{" "}
                        {isAr ? "دقيقة" : "min"}
                      </p>
                      <a
                        href={`tel:${entry.patientPhone}`}
                        className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5 hover:text-teal-800"
                        dir="ltr"
                      >
                        <Phone className="w-3 h-3" />
                        {entry.patientPhone}
                      </a>
                    </div>
                    <span className="text-sm font-black text-teal-900">
                      {formatEgp(entry.priceEGP)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {entry.type === "ONLINE" && entry.zoomMeetingUrl && (
                      <a
                        href={entry.zoomMeetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-extrabold transition flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        {isAr ? "بدء الجلسة" : "Start session"}
                      </a>
                    )}

                    <a
                      href={entry.whatsappReminderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5B] text-white text-[11px] font-extrabold transition flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {isAr ? "تذكير المريض" : "Remind patient"}
                    </a>

                    {!entry.clinicalRecordSigned && (
                      <button
                        type="button"
                        onClick={() =>
                          setNoteFor(noteFor === entry.appointmentId ? null : entry.appointmentId)
                        }
                        className="px-4 py-2 rounded-xl border border-alabaster-border hover:bg-alabaster-base text-[11px] font-extrabold text-gray-700 transition flex items-center gap-1.5"
                      >
                        <FileSignature className="w-3.5 h-3.5 text-sage-700" />
                        {entry.hasClinicalRecord
                          ? isAr ? "متابعة التقرير" : "Continue note"
                          : isAr ? "كتابة التقرير" : "Write note"}
                      </button>
                    )}

                    {entry.status === "CONFIRMED" && isPast && (
                      <form action={completeAction}>
                        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                        <input type="hidden" name="appointmentId" value={entry.appointmentId} />
                        <button
                          type="submit"
                          disabled={completing}
                          className="px-4 py-2 rounded-xl bg-sage-600 hover:bg-sage-700 disabled:opacity-60 text-white text-[11px] font-extrabold transition flex items-center gap-1.5"
                        >
                          {completing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {isAr ? "إنهاء الجلسة" : "Complete session"}
                        </button>
                      </form>
                    )}
                  </div>

                  {noteFor === entry.appointmentId && (
                    <form
                      action={noteAction}
                      className="pt-3 border-t border-alabaster-border space-y-3"
                    >
                      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                      <input type="hidden" name="appointmentId" value={entry.appointmentId} />

                      <TextArea
                        name="chiefComplaint"
                        label={isAr ? "الشكوى الرئيسية" : "Chief complaint"}
                        rows={2}
                      />
                      <TextArea
                        name="diagnosis"
                        label={isAr ? "التشخيص الإكلينيكي *" : "Clinical diagnosis *"}
                        rows={3}
                        required
                      />
                      <TextArea
                        name="prescriptionNotes"
                        label={isAr ? "الخطة الدوائية" : "Prescription notes"}
                        rows={3}
                      />
                      <TextArea
                        name="followUpPlan"
                        label={isAr ? "خطة المتابعة" : "Follow-up plan"}
                        rows={2}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block space-y-1">
                          <span className="text-[11px] font-bold text-gray-700">
                            {isAr ? "أكواد DSM-5 (مفصولة بفاصلة)" : "DSM-5 codes (comma separated)"}
                          </span>
                          <input
                            type="text"
                            name="dsm5Codes"
                            dir="ltr"
                            placeholder="300.02, 300.01"
                            className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-mono"
                          />
                        </label>

                        <label className="block space-y-1">
                          <span className="text-[11px] font-bold text-gray-700">
                            {isAr ? "تقييم الخطورة" : "Risk assessment"}
                          </span>
                          <select
                            name="riskLevel"
                            defaultValue="LOW"
                            className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
                          >
                            <option value="LOW">{isAr ? "منخفضة" : "Low"}</option>
                            <option value="MODERATE">{isAr ? "متوسطة" : "Moderate"}</option>
                            <option value="HIGH">{isAr ? "مرتفعة" : "High"}</option>
                          </select>
                        </label>
                      </div>

                      <label className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer">
                        <input type="checkbox" name="sign" className="mt-0.5 w-4 h-4 accent-teal-800" />
                        <span className="text-[11px] text-amber-900 leading-relaxed">
                          {isAr
                            ? "توقيع التقرير نهائياً. بعد التوقيع لا يمكن تعديله، ويصبح ظاهراً للمريض في بوابته."
                            : "Sign this record. Once signed it cannot be edited, and it becomes visible to the patient."}
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={savingNote}
                        className="w-full py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 disabled:opacity-60 text-white text-xs font-extrabold transition flex items-center justify-center gap-2"
                      >
                        {savingNote ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileSignature className="w-4 h-4" />
                        )}
                        {isAr ? "حفظ التقرير الإكلينيكي" : "Save clinical note"}
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        ))}

      {/* ------------------------------------------------- availability ---- */}
      {tab === "AVAILABILITY" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-teal-950">
              {isAr ? "إضافة نافذة عمل أسبوعية" : "Add a weekly working window"}
            </h3>

            <form action={addAction} className="space-y-3">
              <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
              <input type="hidden" name="startMinutesUTC" value={cairoLabelToUtcMinutes(startLabel)} />
              <input type="hidden" name="endMinutesUTC" value={cairoLabelToUtcMinutes(endLabel)} />

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-gray-700">
                    {isAr ? "اليوم" : "Day"}
                  </span>
                  <select
                    name="dayOfWeek"
                    defaultValue="0"
                    className="w-full bg-alabaster-muted px-3 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
                  >
                    {dayNames.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-gray-700">
                    {isAr ? "من (توقيت القاهرة)" : "From (Cairo)"}
                  </span>
                  <input
                    type="time"
                    value={startLabel}
                    onChange={(event) => setStartLabel(event.target.value)}
                    className="w-full bg-alabaster-muted px-3 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-mono"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-gray-700">
                    {isAr ? "إلى" : "To"}
                  </span>
                  <input
                    type="time"
                    value={endLabel}
                    onChange={(event) => setEndLabel(event.target.value)}
                    className="w-full bg-alabaster-muted px-3 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-mono"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-gray-700">
                    {isAr ? "مدة الجلسة" : "Slot length"}
                  </span>
                  <select
                    name="slotDurationMins"
                    defaultValue="45"
                    className="w-full bg-alabaster-muted px-3 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
                  >
                    {SESSION_DURATIONS.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration} {isAr ? "دقيقة" : "min"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isOnlineAvailable"
                    defaultChecked
                    className="w-4 h-4 accent-teal-800"
                  />
                  {isAr ? "متاح أونلاين" : "Available online"}
                </label>
                <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isOfflineAvailable"
                    className="w-4 h-4 accent-teal-800"
                  />
                  {isAr ? "متاح بالعيادة" : "Available in-clinic"}
                </label>
              </div>

              <button
                type="submit"
                disabled={adding}
                className="px-5 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-900 disabled:opacity-60 text-white text-xs font-extrabold transition flex items-center gap-2"
              >
                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                {isAr ? "إضافة النافذة" : "Add window"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm overflow-hidden">
            {availability.filter((rule) => rule.isActive).length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-500 font-semibold">
                {isAr
                  ? "لا توجد نوافذ عمل. أضف نافذة ليتمكن المرضى من الحجز."
                  : "No working windows yet. Add one so patients can book."}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {availability
                  .filter((rule) => rule.isActive)
                  .map((rule) => (
                    <li
                      key={rule.id}
                      className="p-4 flex items-center justify-between gap-4 flex-wrap"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-extrabold text-teal-950">
                          {dayNames[rule.dayOfWeek]}
                          <span className="font-mono font-bold text-gray-700 mx-2" dir="ltr">
                            {utcMinutesToCairoLabel(rule.startMinutesUTC)} –{" "}
                            {utcMinutesToCairoLabel(rule.endMinutesUTC)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {isAr ? "بتوقيت القاهرة (شتوي)" : "Cairo (winter) time"}
                          </span>
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {rule.slotDurationMins} {isAr ? "دقيقة للجلسة" : "min slots"} ·{" "}
                          {[
                            rule.isOnlineAvailable && (isAr ? "أونلاين" : "online"),
                            rule.isOfflineAvailable && (isAr ? "بالعيادة" : "in-clinic"),
                          ]
                            .filter(Boolean)
                            .join(isAr ? " و" : " & ")}
                        </p>
                      </div>

                      <form action={removeAction}>
                        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                        <input type="hidden" name="availabilityId" value={rule.id} />
                        <button
                          type="submit"
                          disabled={removing}
                          className="px-3 py-2 rounded-xl border border-crisis/30 text-crisis-dark hover:bg-crisis-light disabled:opacity-60 text-[11px] font-extrabold transition flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {isAr ? "إيقاف" : "Remove"}
                        </button>
                      </form>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TextArea({
  name,
  label,
  rows,
  required,
}: {
  name: string;
  label: string;
  rows: number;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-bold text-gray-700">{label}</span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium leading-relaxed"
      />
    </label>
  );
}
