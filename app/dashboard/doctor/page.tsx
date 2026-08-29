import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, CalendarCheck, CalendarRange, Clock, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import {
  getMyAgendaAction,
  getMyAvailabilityAction,
  getTimeOffAction,
} from "@/app/actions/doctor.actions";
import { formatCairo, formatEgp } from "@/lib/whatsapp";
import { DoctorWorkspace } from "@/components/dashboard/DoctorWorkspace";
import { getLanguage } from "@/lib/i18n/server";

import { startOfCairoDayUtc } from "@/lib/time/cairo";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "لوحة الاستشاري | مركز أسما للصحة النفسية"
        : "Doctor Workspace | Asmaa Mental Health Center",
    description:
      lang === "ar"
        ? "جدول جلساتك، مواعيد عملك الأسبوعية، وتقاريرك الإكلينيكية."
        : "Consultant agenda, weekly scheduling rules, patient charts, and electronic clinical records.",
  };
}

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ range?: string; from?: string; days?: string }>;
}

export default async function DoctorDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rangePreset = params.range ?? "month";

  const now = new Date();
  let fromUTC: string | undefined;
  let days: number = 30;

  if (rangePreset === "today") {
    fromUTC = startOfCairoDayUtc(now).toISOString();
    days = 1;
  } else if (rangePreset === "week") {
    fromUTC = startOfCairoDayUtc(now).toISOString();
    days = 7;
  } else if (rangePreset === "all") {
    const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    fromUTC = past30Days.toISOString();
    days = 90;
  } else {
    // Default 30-day window (now - 7 days to + 23 days)
    const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    fromUTC = past7Days.toISOString();
    days = 30;
  }

  const [auth, lang] = await Promise.all([
    requireRolePage(["DOCTOR"], "/dashboard/doctor"),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  const [agendaResult, availabilityResult, timeOffResult, csrfToken] = await Promise.all([
    getMyAgendaAction({ fromUTC, days }),
    getMyAvailabilityAction(),
    getTimeOffAction(),
    readCsrfToken(),
  ]);

  if (!agendaResult.ok || !availabilityResult.ok || !timeOffResult.ok) {
    const errorResult = !agendaResult.ok
      ? agendaResult
      : !availabilityResult.ok
      ? availabilityResult
      : !timeOffResult.ok
      ? timeOffResult
      : null;

    const message = errorResult
      ? isAr
        ? errorResult.messageAr
        : errorResult.messageEn ?? errorResult.messageAr
      : "";

    return (
      <div className="min-h-screen py-16 bg-alabaster-base">
        <div className="max-w-lg mx-auto px-4 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-crisis mx-auto" />
          <h1 className="text-lg font-black text-crisis-dark">
            {isAr ? "تعذّر تحميل لوحة الاستشاري" : "Unable to load consultant workspace"}
          </h1>
          <p className="text-xs text-gray-600 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    );
  }

  const agenda = agendaResult.data;
  const nowMs = Date.now();

  const upcoming = agenda.filter((entry) => new Date(entry.scheduledAtUTC).getTime() >= nowMs);
  const nextSession = upcoming[0];
  const uniquePatients = new Set(agenda.map((entry) => entry.patientId)).size;
  const pendingNotes = agenda.filter(
    (entry) =>
      new Date(entry.scheduledAtUTC).getTime() < nowMs && !entry.clinicalRecordSigned,
  ).length;
  const monthEarnings = agenda
    .filter((entry) => entry.status === "COMPLETED")
    .reduce((total, entry) => total + entry.priceEGP, 0);

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        <header className="bg-teal-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-800 border border-teal-700 flex items-center justify-center text-sage-300 shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black">{auth.user.fullName}</h1>
                <p className="text-xs text-teal-300 mt-0.5">
                  {nextSession
                    ? isAr
                      ? `جلستك القادمة: ${formatCairo(new Date(nextSession.scheduledAtUTC), lang)} مع ${nextSession.patientName}`
                      : `Next session: ${formatCairo(new Date(nextSession.scheduledAtUTC), lang)} with ${nextSession.patientName}`
                    : isAr
                    ? "لا توجد جلسات قادمة مجدولة في هذا النطاق."
                    : "No upcoming consultations in this window."}
                </p>
              </div>
            </div>

            {/* Date Range Presets Navigation (D3) */}
            <div className="flex items-center gap-1.5 p-1.5 bg-teal-900/80 border border-teal-700/60 rounded-2xl self-start sm:self-auto">
              <Link
                href="/dashboard/doctor?range=today"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  rangePreset === "today"
                    ? "bg-sage-400 text-teal-950 shadow-sm"
                    : "text-teal-200 hover:text-white hover:bg-teal-800/60"
                }`}
              >
                {isAr ? "اليوم" : "Today"}
              </Link>
              <Link
                href="/dashboard/doctor?range=week"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  rangePreset === "week"
                    ? "bg-sage-400 text-teal-950 shadow-sm"
                    : "text-teal-200 hover:text-white hover:bg-teal-800/60"
                }`}
              >
                {isAr ? "هذا الأسبوع" : "This Week"}
              </Link>
              <Link
                href="/dashboard/doctor?range=month"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  rangePreset === "month"
                    ? "bg-sage-400 text-teal-950 shadow-sm"
                    : "text-teal-200 hover:text-white hover:bg-teal-800/60"
                }`}
              >
                {isAr ? "٣٠ يوماً" : "30 Days"}
              </Link>
              <Link
                href="/dashboard/doctor?range=all"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  rangePreset === "all"
                    ? "bg-sage-400 text-teal-950 shadow-sm"
                    : "text-teal-200 hover:text-white hover:bg-teal-800/60"
                }`}
              >
                {isAr ? "الكل (٩٠ يوماً)" : "All (90d)"}
              </Link>
            </div>
          </div>
        </header>

        {/* Dashboard KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat
            icon={CalendarCheck}
            label={isAr ? "جلسات قادمة" : "Upcoming Sessions"}
            value={String(upcoming.length)}
          />
          <Stat
            icon={Users}
            label={isAr ? "مرضى في الفترة" : "Active Patients"}
            value={String(uniquePatients)}
          />
          <Stat
            icon={Stethoscope}
            label={isAr ? "تقارير بانتظار التوثيق" : "Pending Notes"}
            value={String(pendingNotes)}
            tone={pendingNotes > 0 ? "warn" : undefined}
          />
          <Stat
            icon={ShieldCheck}
            label={isAr ? "إيراد الجلسات المكتملة" : "Completed Revenue"}
            value={formatEgp(monthEarnings, lang)}
          />
        </div>

        <DoctorWorkspace
          agenda={agenda}
          availability={availabilityResult.data}
          timeOff={timeOffResult.data}
          csrfToken={csrfToken}
        />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="bg-white p-4 rounded-3xl border border-alabaster-border shadow-sm space-y-1.5">
      <Icon className={`w-4 h-4 ${tone === "warn" ? "text-amber-600" : "text-sage-700"}`} />
      <p className="text-[10px] text-gray-400 font-bold">{label}</p>
      <p
        className={`text-xl font-black tabular-nums ${
          tone === "warn" ? "text-amber-700" : "text-teal-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
