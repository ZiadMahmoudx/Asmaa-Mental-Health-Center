"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Copy,
  Edit2,
  Grid,
  List,
  Loader2,
  Plus,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type {
  AffectedAppointment,
  AvailabilityRuleView,
} from "@/app/actions/doctor.actions";
import {
  addAvailabilityRuleAction,
  getAvailabilityImpactAction,
  retireAvailabilityRuleAction,
  updateAvailabilityRuleAction,
} from "@/app/actions/doctor.actions";
import { CSRF_FIELD, SESSION_DURATIONS } from "@/lib/constants";
import {
  cairoLabelToUtcMinutes,
  DAY_NAMES_AR,
  utcMinutesToCairoLabel,
} from "@/lib/time/cairo";
import { ImpactWarning } from "./ImpactWarning";

const DAY_NAMES_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface Props {
  availability: AvailabilityRuleView[];
  csrfToken: string;
  doctorId?: string; // Passed when rendered by Admin
  isAdmin?: boolean;
}

export function WeeklyScheduleEditor({
  availability,
  csrfToken,
  doctorId,
  isAdmin = false,
}: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  // View mode: Grid vs List
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");

  // State for forms
  const [isAdding, setIsAdding] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMins: number;
    isOnline: boolean;
    isOffline: boolean;
  }>({
    dayOfWeek: 0,
    startTime: "16:00",
    endTime: "20:00",
    slotDurationMins: 45,
    isOnline: true,
    isOffline: false,
  });
  const [editingRule, setEditingRule] = useState<AvailabilityRuleView | null>(null);

  // Pre-flight impact warning state for delete/edit
  const [impactList, setImpactList] = useState<AffectedAppointment[]>([]);
  const [impactHorizon, setImpactHorizon] = useState(21);
  const [impactConfirmed, setImpactConfirmed] = useState(false);
  const [retiringId, setRetiringId] = useState<string | null>(null);

  // Form actions
  const [addState, addAction, isAddPending] = useActionState(addAvailabilityRuleAction, null);
  const [editState, editAction, isEditPending] = useActionState(updateAvailabilityRuleAction, null);
  const [retireState, retireAction, isRetirePending] = useActionState(retireAvailabilityRuleAction, null);

  useEffect(() => {
    if (addState?.ok) {
      setIsAdding(false);
      router.refresh();
    }
  }, [addState, router]);

  useEffect(() => {
    if (editState?.ok) {
      setEditingRule(null);
      setImpactList([]);
      setImpactConfirmed(false);
      router.refresh();
    }
  }, [editState, router]);

  useEffect(() => {
    if (retireState?.ok) {
      setRetiringId(null);
      setImpactList([]);
      setImpactConfirmed(false);
      router.refresh();
    }
  }, [retireState, router]);

  function handleOpenAddForDay(dayIndex: number) {
    setInitialFormValues({
      dayOfWeek: dayIndex,
      startTime: "16:00",
      endTime: "20:00",
      slotDurationMins: 45,
      isOnline: true,
      isOffline: false,
    });
    setEditingRule(null);
    setIsAdding(true);
  }

  function handleDuplicateRule(rule: AvailabilityRuleView) {
    setInitialFormValues({
      dayOfWeek: (rule.dayOfWeek + 1) % 7,
      startTime: utcMinutesToCairoLabel(rule.startMinutesUTC),
      endTime: utcMinutesToCairoLabel(rule.endMinutesUTC),
      slotDurationMins: rule.slotDurationMins,
      isOnline: rule.isOnlineAvailable,
      isOffline: rule.isOfflineAvailable,
    });
    setEditingRule(null);
    setIsAdding(true);
  }

  async function checkRetireImpact(rule: AvailabilityRuleView) {
    setRetiringId(rule.id);
    const res = await getAvailabilityImpactAction({
      doctorId,
      availabilityId: rule.id,
      dayOfWeek: rule.dayOfWeek,
      startMinutesUTC: 0,
      endMinutesUTC: 0, // completely removing window
    });
    if (res.ok) {
      setImpactList(res.data.affectedAppointments);
      setImpactHorizon(res.data.horizonDays);
      setImpactConfirmed(res.data.affectedAppointments.length === 0);
    }
  }

  // Group rules by dayOfWeek (0 to 6)
  const rulesByDay: Record<number, AvailabilityRuleView[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
  for (const rule of availability) {
    if (rulesByDay[rule.dayOfWeek]) {
      rulesByDay[rule.dayOfWeek].push(rule);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div>
          <h3 className="font-bold text-slate-900 text-base">
            {isAr ? "مواعيد وساعات العمل الأسبوعية" : "Weekly Schedule & Availability Windows"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAr
              ? "تتكرر هذه الفترات أسبوعياً وتُحسب تلقائياً لحجز الجلسات بتوقيت القاهرة."
              : "Recurring weekly availability rules computed for Cairo wall-clock bookings."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              aria-label={isAr ? "عرض الشبكة" : "Grid View"}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === "GRID"
                  ? "bg-white text-teal-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isAr ? "شبكة الأيام" : "Week Grid"}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              aria-label={isAr ? "عرض القائمة" : "List View"}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === "LIST"
                  ? "bg-white text-teal-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isAr ? "قائمة" : "List"}</span>
            </button>
          </div>

          {!isAdding && !editingRule && (
            <button
              type="button"
              onClick={() => {
                setInitialFormValues({
                  dayOfWeek: 0,
                  startTime: "16:00",
                  endTime: "20:00",
                  slotDurationMins: 45,
                  isOnline: true,
                  isOffline: false,
                });
                setIsAdding(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-2xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? "إضافة فترة عمل" : "Add Window"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Form Modal/Card */}
      {isAdding && (
        <form
          action={addAction}
          className="p-6 bg-white border-2 border-teal-600 rounded-3xl space-y-4 shadow-xl text-start"
        >
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          {doctorId && <input type="hidden" name="doctorId" value={doctorId} />}

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-teal-700" />
              <span>{isAr ? "إضافة فترة عمل أسبوعية جديدة" : "New Weekly Working Window"}</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label={isAr ? "إغلاق" : "Close"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!addState?.ok && addState && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {isAr ? addState.messageAr : addState.messageEn ?? addState.messageAr}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "يوم الأسبوع" : "Day of the Week"}
              </label>
              <select
                name="dayOfWeek"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                defaultValue={initialFormValues.dayOfWeek}
              >
                {(isAr ? DAY_NAMES_AR : DAY_NAMES_EN).map((name, index) => (
                  <option key={index} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "من الساعة (بتوقيت القاهرة)" : "Start Time (Cairo)"}
              </label>
              <input
                type="time"
                defaultValue={initialFormValues.startTime}
                onChange={(e) => {
                  const target = document.getElementById("add_startMinutesUTC") as HTMLInputElement;
                  if (target) target.value = String(cairoLabelToUtcMinutes(e.target.value));
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
              <input
                type="hidden"
                id="add_startMinutesUTC"
                name="startMinutesUTC"
                defaultValue={cairoLabelToUtcMinutes(initialFormValues.startTime)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "إلى الساعة (بتوقيت القاهرة)" : "End Time (Cairo)"}
              </label>
              <input
                type="time"
                defaultValue={initialFormValues.endTime}
                onChange={(e) => {
                  const target = document.getElementById("add_endMinutesUTC") as HTMLInputElement;
                  if (target) target.value = String(cairoLabelToUtcMinutes(e.target.value));
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
              <input
                type="hidden"
                id="add_endMinutesUTC"
                name="endMinutesUTC"
                defaultValue={cairoLabelToUtcMinutes(initialFormValues.endTime)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "مدة الجلسة" : "Slot Duration"}
              </label>
              <select
                name="slotDurationMins"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                defaultValue={initialFormValues.slotDurationMins}
              >
                {SESSION_DURATIONS.map((dur) => (
                  <option key={dur} value={dur}>
                    {dur} {isAr ? "دقيقة" : "min"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  name="isOnlineAvailable"
                  defaultChecked={initialFormValues.isOnline}
                  className="rounded border-slate-300 text-teal-600 w-4 h-4"
                />
                <span>{isAr ? "جلسات أونلاين (زووم)" : "Online (Zoom)"}</span>
              </label>

              <label className={`flex items-center gap-2 text-xs font-bold ${isAdmin ? "cursor-pointer text-slate-700" : "cursor-not-allowed text-slate-400"}`}>
                <input
                  type="checkbox"
                  name="isOfflineAvailable"
                  defaultChecked={isAdmin ? initialFormValues.isOffline : false}
                  disabled={!isAdmin}
                  className="rounded border-slate-300 text-teal-600 w-4 h-4 disabled:opacity-50"
                />
                <span>{isAr ? "زيارات عيادة حضورية" : "In-Clinic"}</span>
              </label>
            </div>

            {!isAdmin && (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                ℹ️ {isAr ? "مواعيد العيادة تُجدول وتُدار عن طريق إدارة المركز." : "In-clinic slots are scheduled and managed by clinic administration."}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isAddPending}
              className="inline-flex items-center gap-2 px-6 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
            >
              {isAddPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isAr ? "حفظ الفترة" : "Save Window"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Edit Form Modal/Card */}
      {editingRule && (
        <form
          action={editAction}
          className="p-6 bg-white border-2 border-amber-500 rounded-3xl space-y-4 shadow-xl text-start"
        >
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <input type="hidden" name="availabilityId" value={editingRule.id} />
          {doctorId && <input type="hidden" name="doctorId" value={doctorId} />}

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-amber-600" />
              <span>{isAr ? "تعديل فترة العمل الأسبوعية" : "Edit Weekly Window"}</span>
            </h4>
            <button
              type="button"
              onClick={() => setEditingRule(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label={isAr ? "إغلاق" : "Close"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!editState?.ok && editState && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {isAr ? editState.messageAr : editState.messageEn ?? editState.messageAr}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "يوم الأسبوع" : "Day of the Week"}
              </label>
              <select
                name="dayOfWeek"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                defaultValue={editingRule.dayOfWeek}
              >
                {(isAr ? DAY_NAMES_AR : DAY_NAMES_EN).map((name, index) => (
                  <option key={index} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "من الساعة" : "Start Time"}
              </label>
              <input
                type="time"
                defaultValue={utcMinutesToCairoLabel(editingRule.startMinutesUTC)}
                onChange={(e) => {
                  const target = document.getElementById("edit_startMinutesUTC") as HTMLInputElement;
                  if (target) target.value = String(cairoLabelToUtcMinutes(e.target.value));
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
              <input
                type="hidden"
                id="edit_startMinutesUTC"
                name="startMinutesUTC"
                defaultValue={editingRule.startMinutesUTC}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "إلى الساعة" : "End Time"}
              </label>
              <input
                type="time"
                defaultValue={utcMinutesToCairoLabel(editingRule.endMinutesUTC)}
                onChange={(e) => {
                  const target = document.getElementById("edit_endMinutesUTC") as HTMLInputElement;
                  if (target) target.value = String(cairoLabelToUtcMinutes(e.target.value));
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
              <input
                type="hidden"
                id="edit_endMinutesUTC"
                name="endMinutesUTC"
                defaultValue={editingRule.endMinutesUTC}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "مدة الجلسة" : "Slot Duration"}
              </label>
              <select
                name="slotDurationMins"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                defaultValue={editingRule.slotDurationMins}
              >
                {SESSION_DURATIONS.map((dur) => (
                  <option key={dur} value={dur}>
                    {dur} {isAr ? "دقيقة" : "min"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  name="isOnlineAvailable"
                  defaultChecked={editingRule.isOnlineAvailable}
                  className="rounded border-slate-300 text-teal-600 w-4 h-4"
                />
                <span>{isAr ? "جلسات أونلاين (زووم)" : "Online (Zoom)"}</span>
              </label>

              <label className={`flex items-center gap-2 text-xs font-bold ${isAdmin ? "cursor-pointer text-slate-700" : "cursor-not-allowed text-slate-400"}`}>
                <input
                  type="checkbox"
                  name="isOfflineAvailable"
                  defaultChecked={editingRule.isOfflineAvailable}
                  disabled={!isAdmin}
                  className="rounded border-slate-300 text-teal-600 w-4 h-4 disabled:opacity-50"
                />
                <span>{isAr ? "زيارات عيادة حضورية" : "In-Clinic"}</span>
              </label>
            </div>

            {!isAdmin && (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                ℹ️ {isAr ? "مواعيد العيادة تُجدول وتُدار عن طريق إدارة المركز." : "In-clinic slots are scheduled and managed by clinic administration."}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingRule(null)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isEditPending}
              className="inline-flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
            >
              {isEditPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isAr ? "حفظ التعديلات" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      )}

      {/* 7-DAY VISUAL WEEK GRID VIEW (Phase 4) */}
      {viewMode === "GRID" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
            const dayRules = rulesByDay[dayIdx] ?? [];
            const dayName = isAr ? DAY_NAMES_AR[dayIdx] : DAY_NAMES_EN[dayIdx];

            return (
              <div
                key={dayIdx}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between overflow-hidden"
              >
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900">{dayName}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {dayRules.length}
                  </span>
                </div>

                <div className="p-2.5 space-y-2 flex-1">
                  {dayRules.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-6 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                      <span className="text-[11px] font-bold text-slate-400">
                        {isAr ? "يوم عطلة" : "Off"}
                      </span>
                    </div>
                  ) : (
                    dayRules.map((rule) => {
                      const startLabel = utcMinutesToCairoLabel(rule.startMinutesUTC);
                      const endLabel = utcMinutesToCairoLabel(rule.endMinutesUTC);

                      return (
                        <div
                          key={rule.id}
                          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-600 transition space-y-2"
                        >
                          <div className="font-mono text-xs font-black text-teal-950" dir="ltr">
                            {startLabel} - {endLabel}
                          </div>

                          <div className="flex items-center gap-1 flex-wrap text-[10px]">
                            {rule.isOnlineAvailable && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-teal-100/70 text-teal-800 font-bold">
                                <Video className="w-2.5 h-2.5" />
                                <span>{isAr ? "أونلاين" : "Online"}</span>
                              </span>
                            )}
                            {rule.isOfflineAvailable && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-800 font-bold">
                                <Building2 className="w-2.5 h-2.5" />
                                <span>{isAr ? "عيادة" : "Clinic"}</span>
                              </span>
                            )}
                          </div>

                          {/* Action icons */}
                          <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-200/60">
                            <button
                              type="button"
                              onClick={() => handleDuplicateRule(rule)}
                              title={isAr ? "تكرار ليوم آخر" : "Duplicate to another day"}
                              className="p-1 text-slate-400 hover:text-teal-800 rounded hover:bg-slate-100 transition"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRule(rule)}
                              title={isAr ? "تعديل" : "Edit"}
                              className="p-1 text-slate-400 hover:text-amber-700 rounded hover:bg-slate-100 transition"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => checkRetireImpact(rule)}
                              title={isAr ? "إلغاء الفترة" : "Retire"}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-2 bg-slate-50/50 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenAddForDay(dayIdx)}
                    className="w-full py-1.5 text-[10px] font-bold text-teal-800 hover:bg-teal-50 rounded-lg transition flex items-center justify-center gap-1 border border-dashed border-teal-200"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isAr ? "إضافة فترة" : "Add Window"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rules List View (Phase 4) */}
      {viewMode === "LIST" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availability.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white border border-slate-200 rounded-3xl text-slate-400 shadow-sm">
              <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-bold text-slate-600">
                {isAr ? "لا توجد فترات عمل مسجلة حالياً." : "No working windows currently registered."}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? "اضغط على إضافة فترة عمل جديدة لبدء استقبال الحجوزات."
                  : "Click add working window to publish available appointment slots."}
              </p>
            </div>
          ) : (
            availability.map((rule) => {
              const startLabel = utcMinutesToCairoLabel(rule.startMinutesUTC);
              const endLabel = utcMinutesToCairoLabel(rule.endMinutesUTC);
              const isRetiringThis = retiringId === rule.id;

              return (
                <div
                  key={rule.id}
                  className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between space-y-4 hover:border-teal-600 hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-base">
                        {isAr ? DAY_NAMES_AR[rule.dayOfWeek] : DAY_NAMES_EN[rule.dayOfWeek]}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                        {rule.slotDurationMins} {isAr ? "دقيقة" : "min"}
                      </span>
                    </div>

                    <div className="mt-2 text-lg font-bold font-mono text-teal-800" dir="ltr">
                      {startLabel} — {endLabel}
                    </div>

                    <div className="flex gap-2 mt-3">
                      {rule.isOnlineAvailable && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-bold border border-teal-200">
                          <Video className="w-3.5 h-3.5" />
                          <span>{isAr ? "أونلاين" : "Online"}</span>
                        </span>
                      )}
                      {rule.isOfflineAvailable && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{isAr ? "عيادة" : "In-clinic"}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Retirement pre-flight warning box */}
                  {isRetiringThis && (
                    <form action={retireAction} className="space-y-3 pt-3 border-t border-slate-100">
                      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                      <input type="hidden" name="availabilityId" value={rule.id} />
                      {doctorId && <input type="hidden" name="doctorId" value={doctorId} />}

                      <ImpactWarning
                        affected={impactList}
                        horizonDays={impactHorizon}
                        confirmed={impactConfirmed}
                        onConfirmChange={setImpactConfirmed}
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRetiringId(null)}
                          className="flex-1 py-2 border border-slate-300 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
                        >
                          {isAr ? "تراجع" : "Cancel"}
                        </button>
                        <button
                          type="submit"
                          disabled={!impactConfirmed || isRetirePending}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl disabled:opacity-40 shadow-sm"
                        >
                          {isRetirePending && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
                          <span>{isAr ? "تأكيد الإلغاء" : "Confirm Retirement"}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Action buttons when not retiring */}
                  {!isRetiringThis && (
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleDuplicateRule(rule)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-teal-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition"
                      >
                        <Copy className="w-3.5 h-3.5 text-teal-700" />
                        <span>{isAr ? "تكرار" : "Duplicate"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingRule(rule)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-teal-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isAr ? "تعديل" : "Edit"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => checkRetireImpact(rule)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-xl hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isAr ? "إلغاء الفترة" : "Retire"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
