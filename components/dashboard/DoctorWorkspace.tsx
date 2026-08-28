"use client";

import React, { useState } from "react";
import { Calendar, CalendarClock, CalendarOff } from "lucide-react";
import type {
  AvailabilityRuleView,
  DoctorAgendaEntry,
  TimeOffView,
} from "@/app/actions/doctor.actions";
import { AgendaList } from "./agenda/AgendaList";
import { WeeklyScheduleEditor } from "./schedule/WeeklyScheduleEditor";
import { TimeOffManager } from "./schedule/TimeOffManager";

interface Props {
  agenda: DoctorAgendaEntry[];
  availability: AvailabilityRuleView[];
  timeOff: TimeOffView[];
  csrfToken: string;
  isAdmin?: boolean;
  doctorId?: string;
  doctorName?: string;
}

export type WorkspaceTab = "AGENDA" | "WEEKLY_SCHEDULE" | "TIME_OFF";

export function DoctorWorkspace({
  agenda,
  availability,
  timeOff,
  csrfToken,
  isAdmin = false,
  doctorId,
  doctorName,
}: Props) {
  const [tab, setTab] = useState<WorkspaceTab>("AGENDA");

  return (
    <div className="space-y-6">
      {/* Workspace Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl">
          <button
            type="button"
            onClick={() => setTab("AGENDA")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              tab === "AGENDA"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4" />
            الجدول اليومي ({agenda.length})
          </button>

          <button
            type="button"
            onClick={() => setTab("WEEKLY_SCHEDULE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              tab === "WEEKLY_SCHEDULE"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            مواعيد العمل الأسبوعية ({availability.length})
          </button>

          <button
            type="button"
            onClick={() => setTab("TIME_OFF")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              tab === "TIME_OFF"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CalendarOff className="w-4 h-4" />
            الإجازات والإغلاق ({timeOff.length})
          </button>
        </div>

        {doctorName && (
          <div className="text-xs font-semibold text-slate-500">
            ملف الاستشاري: <strong className="text-slate-900 dark:text-white">{doctorName}</strong>
          </div>
        )}
      </div>

      {/* Tab Panels */}
      {tab === "AGENDA" && (
        <AgendaList agenda={agenda} csrfToken={csrfToken} isAdmin={isAdmin} />
      )}

      {tab === "WEEKLY_SCHEDULE" && (
        <WeeklyScheduleEditor
          availability={availability}
          csrfToken={csrfToken}
          doctorId={doctorId}
        />
      )}

      {tab === "TIME_OFF" && (
        <TimeOffManager
          timeOff={timeOff}
          csrfToken={csrfToken}
          isAdmin={isAdmin}
          doctorId={doctorId}
        />
      )}
    </div>
  );
}

// Backward compatibility export
export const DoctorAgenda = DoctorWorkspace;
