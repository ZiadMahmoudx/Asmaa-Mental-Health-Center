import type { Metadata } from "next";
import { CalendarCheck, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getMyAgendaAction, getMyAvailabilityAction } from "@/app/actions/doctor.actions";
import { formatCairo, formatEgp } from "@/lib/whatsapp";
import { DoctorAgenda } from "@/components/dashboard/DoctorAgenda";

export const metadata: Metadata = {
  title: "لوحة الاستشاري | مركز أسما للصحة النفسية",
  description: "جدول جلساتك، مواعيد عملك الأسبوعية، وتقاريرك الإكلينيكية.",
};

/**
 * Consultant dashboard.
 *
 * Server-rendered and scoped by the session: `getMyAgendaAction` and
 * `getMyAvailabilityAction` both resolve the DoctorProfile from the signed-in
 * user and filter every query by it. No doctor id is ever accepted from the
 * request, so one consultant cannot read another's patients by changing a URL.
 */
export const dynamic = "force-dynamic";

export default async function DoctorDashboardPage() {
  const auth = await requireRolePage(["DOCTOR"], "/dashboard/doctor");

  const [agendaResult, availabilityResult, csrfToken] = await Promise.all([
    getMyAgendaAction(),
    getMyAvailabilityAction(),
    readCsrfToken(),
  ]);

  // A DOCTOR account with no linked DoctorProfile is a provisioning error, not a
  // user error — say so plainly instead of rendering an empty agenda.
  if (!agendaResult.ok || !availabilityResult.ok) {
    // Narrow explicitly: TypeScript cannot infer from the combined condition
    // which of the two results is the failing one.
    const message = !agendaResult.ok
      ? agendaResult.messageAr
      : !availabilityResult.ok
        ? availabilityResult.messageAr
        : "";
    return (
      <div className="min-h-screen py-16 bg-alabaster-base">
        <div className="max-w-lg mx-auto px-4 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-crisis mx-auto" />
          <h1 className="text-lg font-black text-crisis-dark">تعذّر تحميل لوحة الاستشاري</h1>
          <p className="text-xs text-gray-600 leading-relaxed">{message}</p>
        </div>
      </div>
    );
  }

  const agenda = agendaResult.data;
  const now = Date.now();

  const upcoming = agenda.filter((entry) => new Date(entry.scheduledAtUTC).getTime() >= now);
  const nextSession = upcoming[0];
  const uniquePatients = new Set(agenda.map((entry) => entry.patientId)).size;
  const pendingNotes = agenda.filter(
    (entry) =>
      new Date(entry.scheduledAtUTC).getTime() < now && !entry.clinicalRecordSigned,
  ).length;
  const monthEarnings = agenda
    .filter((entry) => entry.status === "COMPLETED")
    .reduce((total, entry) => total + entry.priceEGP, 0);

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        <header className="bg-teal-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-800 shadow-xl space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-800 border border-teal-700 flex items-center justify-center text-sage-300">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black">{auth.user.fullName}</h1>
              <p className="text-xs text-teal-300">
                {nextSession
                  ? `جلستك القادمة: ${formatCairo(new Date(nextSession.scheduledAtUTC))} مع ${nextSession.patientName}`
                  : "لا توجد جلسات قادمة مجدولة."}
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat
            icon={CalendarCheck}
            label="جلسات قادمة"
            value={String(upcoming.length)}
          />
          <Stat icon={Users} label="مرضى في الفترة" value={String(uniquePatients)} />
          <Stat
            icon={Stethoscope}
            label="تقارير بانتظار التوقيع"
            value={String(pendingNotes)}
            tone={pendingNotes > 0 ? "warn" : undefined}
          />
          <Stat
            icon={ShieldCheck}
            label="إيراد الجلسات المكتملة"
            value={formatEgp(monthEarnings)}
          />
        </div>

        <DoctorAgenda
          agenda={agenda}
          availability={availabilityResult.data}
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
    <div className="bg-white p-4 rounded-2xl border border-alabaster-border shadow-sm space-y-1.5">
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
