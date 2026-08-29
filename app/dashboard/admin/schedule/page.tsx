import type { Metadata } from "next";
import { CalendarClock, Shield, UserCheck } from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getDoctorRosterAction } from "@/app/actions/metrics.actions";
import {
  getMyAvailabilityAction,
  getTimeOffAction,
} from "@/app/actions/doctor.actions";
import { WeeklyScheduleEditor } from "@/components/dashboard/schedule/WeeklyScheduleEditor";
import { TimeOffManager } from "@/components/dashboard/schedule/TimeOffManager";
import Link from "next/link";

export const metadata: Metadata = {
  title: "إدارة مواعيد الأطباء | لوحة الإدارة",
  description: "التحكم في فترات العمل الأسبوعية والإجازات لجميع استشاريي المركز.",
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ doctorId?: string }>;
}

export default async function AdminSchedulePage({ searchParams }: Props) {
  await requireRolePage(["ADMIN"], "/dashboard/admin/schedule");

  const { doctorId } = await searchParams;
  const [rosterResult, csrfToken] = await Promise.all([
    getDoctorRosterAction(),
    readCsrfToken(),
  ]);

  if (!rosterResult.ok) {
    return (
      <div className="p-8 text-center text-red-600">
        تعذّر تحميل قائمة الأطباء: {rosterResult.messageAr}
      </div>
    );
  }

  const doctors = rosterResult.data;
  const selectedDoctorId = doctorId || doctors[0]?.id;
  const activeDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  const [availabilityResult, timeOffResult] = await Promise.all([
    selectedDoctorId ? getMyAvailabilityAction(selectedDoctorId) : { ok: true, data: [] },
    selectedDoctorId ? getTimeOffAction(selectedDoctorId, true) : { ok: true, data: [] },
  ]);

  return (
    <div className="min-h-screen py-8 bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-800 border border-teal-100">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">إدارة جداول ومواعيد الأطباء</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                تعديل فترات العمل الأسبوعية، تسجيل إجازات العيادة، وفك أقفال المواعيد.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin"
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
            >
              العودة للوحة الإدارة
            </Link>
          </div>
        </div>

        {/* Doctor Selector Tabs */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <label className="block text-xs font-bold text-slate-700">
            اختر الطبيب المستهدف للإدارة:
          </label>
          <div className="flex flex-wrap gap-2">
            {doctors.map((doc) => {
              const isSelected = doc.id === selectedDoctorId;
              return (
                <Link
                  key={doc.id}
                  href={`/dashboard/admin/schedule?doctorId=${doc.id}`}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
                    isSelected
                      ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-700 hover:bg-white"
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  {doc.fullName}
                  <span className="text-[10px] opacity-80 mr-1 font-normal">
                    ({doc.availabilityWindows} فترات)
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
                <span>فترات العمل الأسبوعية للاستشاري: </span>
                <span className="text-teal-800 font-bold">{activeDoctor.fullName}</span>
              </div>

              <WeeklyScheduleEditor
                availability={availabilityResult.ok ? availabilityResult.data : []}
                csrfToken={csrfToken}
                doctorId={activeDoctor.id}
              />
            </div>

            {/* Time-off & Blackout Manager for Selected Doctor */}
            <div className="space-y-3 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <span>الإجازات والإغلاق المؤقت للاستشاري: </span>
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
      </div>
    </div>
  );
}
