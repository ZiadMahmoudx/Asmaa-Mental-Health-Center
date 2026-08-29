import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, UserCheck } from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getDoctorRosterAction } from "@/app/actions/metrics.actions";
import {
  getMyAvailabilityAction,
  getTimeOffAction,
} from "@/app/actions/doctor.actions";
import { getClinicRoomsAction } from "@/app/actions/rooms.actions";
import { WeeklyScheduleEditor } from "@/components/dashboard/schedule/WeeklyScheduleEditor";
import { TimeOffManager } from "@/components/dashboard/schedule/TimeOffManager";
import { RoomManagementCard } from "@/components/admin/rooms/RoomManagementCard";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "إدارة مواعيد الأطباء | لوحة الإدارة"
        : "Doctor Schedules & Time Off | Admin Portal",
    description:
      lang === "ar"
        ? "التحكم في فترات العمل الأسبوعية والإجازات لجميع استشاريي المركز."
        : "Manage recurring weekly availability windows, clinic closures, and doctor blackout dates.",
  };
}

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ doctorId?: string }>;
}

export default async function AdminSchedulePage({ searchParams }: Props) {
  const [_, lang] = await Promise.all([
    requireRolePage(["ADMIN"], "/dashboard/admin/schedule"),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  const { doctorId } = await searchParams;
  const [rosterResult, csrfToken] = await Promise.all([
    getDoctorRosterAction(),
    readCsrfToken(),
  ]);

  if (!rosterResult.ok) {
    return (
      <div className="p-8 text-center text-red-600">
        {isAr
          ? `تعذّر تحميل قائمة الأطباء: ${rosterResult.messageAr}`
          : `Unable to load doctors roster: ${rosterResult.messageEn ?? rosterResult.messageAr}`}
      </div>
    );
  }

  const doctors = rosterResult.data;
  const selectedDoctorId = doctorId || doctors[0]?.id;
  const activeDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  const [availabilityResult, timeOffResult, roomsResult] = await Promise.all([
    selectedDoctorId ? getMyAvailabilityAction(selectedDoctorId) : { ok: true, data: [] },
    selectedDoctorId ? getTimeOffAction(selectedDoctorId, true) : { ok: true, data: [] },
    getClinicRoomsAction(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-800 border border-teal-100 shrink-0">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              {isAr ? "إدارة جداول ومواعيد الأطباء" : "Doctor Schedules & Working Windows"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? "تعديل فترات العمل الأسبوعية، تسجيل إجازات العيادة، وفك أقفال المواعيد."
                : "Configure recurring weekly slots, register time off, and release slot locks."}
            </p>
          </div>
        </div>
      </div>

      {/* Doctor Selector Tabs */}
      <div className="p-4 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-sm">
        <label className="block text-xs font-bold text-slate-700">
          {isAr ? "اختر الطبيب المستهدف للإدارة:" : "Select Consultant to Configure:"}
        </label>
        <div className="flex flex-wrap gap-2">
          {doctors.map((doc) => {
            const isSelected = doc.id === selectedDoctorId;
            return (
              <Link
                key={doc.id}
                href={`/dashboard/admin/schedule?doctorId=${doc.id}`}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition border select-none ${
                  isSelected
                    ? "bg-teal-900 text-white border-teal-900 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-700 hover:bg-white"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>{doc.fullName}</span>
                <span className="text-[10px] opacity-80 mx-1 font-normal">
                  ({doc.availabilityWindows} {isAr ? "فترات" : "windows"})
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {activeDoctor && (
        <div className="space-y-8">
          {/* Weekly Schedule Editor for Selected Doctor */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <span>{isAr ? "فترات العمل الأسبوعية للاستشاري: " : "Weekly Schedule for: "}</span>
              <span className="text-teal-800 font-bold">{activeDoctor.fullName}</span>
            </div>

            <WeeklyScheduleEditor
              availability={availabilityResult.ok ? availabilityResult.data : []}
              csrfToken={csrfToken}
              doctorId={activeDoctor.id}
              isAdmin={true}
            />
          </div>

          {/* Time-off & Blackout Manager for Selected Doctor */}
          <div className="space-y-3 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <span>{isAr ? "الإجازات والإغلاق المؤقت للاستشاري: " : "Time Off & Blocks for: "}</span>
              <span className="text-teal-800 font-bold">{activeDoctor.fullName}</span>
            </div>

            <TimeOffManager
              timeOff={timeOffResult.ok ? timeOffResult.data : []}
              csrfToken={csrfToken}
              isAdmin={true}
              doctorId={activeDoctor.id}
            />
          </div>
        </div>
      )}

      {/* Physical Clinic Rooms Management Card */}
      <RoomManagementCard
        rooms={roomsResult.ok ? roomsResult.data : []}
        csrfToken={csrfToken}
      />
    </div>
  );
}
