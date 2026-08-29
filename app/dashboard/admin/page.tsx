import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  BellRing,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Coins,
  Receipt,
  ShieldAlert,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getClinicMetricsAction, getDoctorRosterAction } from "@/app/actions/metrics.actions";
import { getOpenSafetyAlertsAction } from "@/app/actions/safety.actions";
import { formatCairo, formatEgp } from "@/lib/whatsapp";
import { SafetyAlertQueue } from "@/components/admin/SafetyAlertQueue";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "لوحة الإدارة | مركز أسما للصحة النفسية"
        : "Admin Dashboard | Asmaa Mental Health Center",
    description:
      lang === "ar"
        ? "مؤشرات التشغيل، قائمة الاستشاريين، وطابور طوارئ الأمان النفسي الموحد."
        : "Operational health metrics, clinical roster, payment audit desk, and unified safety triage.",
  };
}

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [_, lang] = await Promise.all([
    requireRolePage(["ADMIN"], "/dashboard/admin"),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  const [metricsResult, rosterResult, safetyAlertsResult, csrfToken] = await Promise.all([
    getClinicMetricsAction(),
    getDoctorRosterAction(),
    getOpenSafetyAlertsAction(),
    readCsrfToken(),
  ]);

  if (!metricsResult.ok) {
    return (
      <div className="min-h-screen py-16 bg-alabaster-base">
        <div className="max-w-lg mx-auto px-4 text-center space-y-2">
          <h1 className="text-lg font-black text-crisis-dark">
            {isAr ? "تعذّر تحميل مؤشرات المركز" : "Unable to load clinic metrics"}
          </h1>
          <p className="text-xs text-gray-600">
            {isAr ? metricsResult.messageAr : metricsResult.messageEn ?? metricsResult.messageAr}
          </p>
        </div>
      </div>
    );
  }

  const metrics = metricsResult.data;
  const roster = rosterResult.ok ? rosterResult.data : [];
  const openSafetyAlerts = safetyAlertsResult.ok ? safetyAlertsResult.data : [];
  const unacknowledgedAlerts = openSafetyAlerts.filter((alert) => !alert.acknowledgedAtUTC);

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        <header className="bg-teal-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black">
              {isAr ? "لوحة إدارة المركز" : "Clinic Administration Portal"}
            </h1>
            <p className="text-xs text-teal-300">
              {isAr
                ? "مؤشرات تشغيلية محدّثة لحظياً من قاعدة البيانات"
                : "Real-time clinical operations and revenue registry"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/admin/staff"
              className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 border border-teal-700"
            >
              <Users className="w-4 h-4" />
              <span>{isAr ? "إدارة طاقم العمل" : "Staff Directory"}</span>
            </Link>
            <Link
              href="/dashboard/admin/appointments"
              className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 border border-teal-700"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>{isAr ? "سجل الحجوزات" : "Bookings Ledger"}</span>
            </Link>
            <Link
              href="/dashboard/admin/schedule"
              className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 border border-teal-700"
            >
              <Clock3 className="w-4 h-4" />
              <span>{isAr ? "إدارة جداول الأطباء" : "Roster Schedules"}</span>
            </Link>
            <Link
              href="/dashboard/admin/credits"
              className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 border border-teal-700"
            >
              <Coins className="w-4 h-4" />
              <span>{isAr ? "أرصدة المرضى" : "Wallet Balances"}</span>
            </Link>
            <Link
              href="/dashboard/admin/reminders"
              className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 border border-teal-700"
            >
              <BellRing className="w-4 h-4" />
              <span>{isAr ? "تذكيرات الجلسات" : "Reminders Queue"}</span>
            </Link>
            <Link
              href="/dashboard/admin/verification"
              className="px-4 py-2.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 shadow-sm"
            >
              <Receipt className="w-4 h-4" />
              <span>{isAr ? "مكتب مراجعة المدفوعات" : "Payment Verification"}</span>
              {metrics.pendingReceipts > 0 && (
                <span className="px-1.5 py-0.5 rounded-lg bg-white text-terracotta-700 text-[10px] font-black">
                  {metrics.pendingReceipts}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Things that need a human today */}
        {(metrics.pendingReceipts > 0 || unacknowledgedAlerts.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metrics.pendingReceipts > 0 && (
              <Link
                href="/dashboard/admin/verification"
                className="p-5 rounded-3xl bg-amber-50 border border-amber-200 hover:border-amber-400 transition flex items-center gap-4 shadow-xs"
              >
                <Receipt className="w-8 h-8 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-black text-amber-900">
                    {isAr
                      ? `${metrics.pendingReceipts} إيصال بانتظار المراجعة`
                      : `${metrics.pendingReceipts} payment receipts awaiting review`}
                  </p>
                  <p className="text-[11px] text-amber-800">
                    {isAr
                      ? "كل إيصال يمثل مريضاً ينتظر تأكيد حجزه."
                      : "Each proof requires review to confirm slot booking and issue WhatsApp link."}
                  </p>
                </div>
              </Link>
            )}

            {unacknowledgedAlerts.length > 0 && (
              <div className="p-5 rounded-3xl bg-red-50 border border-red-200 flex items-center gap-4 shadow-xs">
                <ShieldAlert className="w-8 h-8 text-red-600 shrink-0" />
                <div>
                  <p className="text-sm font-black text-red-950">
                    {isAr
                      ? `${unacknowledgedAlerts.length} بلاغ طوارئ أمان نفسي بانتظار الاستلام`
                      : `${unacknowledgedAlerts.length} unacknowledged safety alerts`}
                  </p>
                  <p className="text-[11px] text-red-800">
                    {isAr
                      ? "مرضى أشاروا لأفكار إيذاء النفس في المقاييس أو الاستبيان."
                      : "Patients who endorsed self-harm items on validated scales or intake triage."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Unified Safety Alert Queue */}
        <section className="space-y-3">
          <h2 className="text-base font-black text-teal-950 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span>{isAr ? "طوارئ الأمان النفسي وبلاغات الخطورة" : "Psychological Safety Alert Desk"}</span>
          </h2>
          <SafetyAlertQueue alerts={openSafetyAlerts} csrfToken={csrfToken} />
        </section>

        {/* Roster */}
        <section className="space-y-3">
          <h2 className="text-base font-black text-teal-950">
            {isAr ? "الاستشاريون وأحمال العمل" : "Consultant Roster & Workload"}
          </h2>

          {roster.length === 0 ? (
            <div className="bg-white rounded-3xl border border-alabaster-border p-10 text-center">
              <p className="text-sm text-gray-500 font-semibold">
                {isAr ? "لا يوجد استشاريون مسجّلون." : "No consultants registered on roster."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[720px]">
                  <thead className="bg-alabaster-base text-gray-500">
                    <tr>
                      <Th>{isAr ? "الاستشاري" : "Consultant"}</Th>
                      <Th>{isAr ? "الترخيص" : "License"}</Th>
                      <Th>{isAr ? "نوافذ العمل" : "Windows"}</Th>
                      <Th>{isAr ? "جلسات قادمة" : "Upcoming"}</Th>
                      <Th>{isAr ? "جلسات مكتملة" : "Completed"}</Th>
                      <Th>{isAr ? "السعر (أونلاين / عيادة)" : "Rate (Online / Clinic)"}</Th>
                      <Th>{isAr ? "الحالة" : "Status"}</Th>
                      <Th>{isAr ? "الإجراء" : "Action"}</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {roster.map((doctor) => (
                      <tr key={doctor.id} className="hover:bg-alabaster-base/60">
                        <td className="px-4 py-3 align-top">
                          <p className="font-extrabold text-gray-900">{doctor.fullName}</p>
                          <p className="text-[11px] text-gray-500 max-w-[220px]">{doctor.title}</p>
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-[11px] text-gray-500" dir="ltr">
                          {doctor.licenseNumber}
                        </td>
                        <td className="px-4 py-3 align-top tabular-nums text-gray-700">
                          {doctor.availabilityWindows}
                        </td>
                        <td className="px-4 py-3 align-top tabular-nums text-gray-700">
                          {doctor.upcomingSessions}
                        </td>
                        <td className="px-4 py-3 align-top tabular-nums text-gray-700">
                          {doctor.completedSessions}
                        </td>
                        <td className="px-4 py-3 align-top tabular-nums text-gray-700 whitespace-nowrap">
                          {formatEgp(doctor.priceOnlineEGP)} / {formatEgp(doctor.priceOfflineEGP)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {doctor.isAcceptingPatients ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold whitespace-nowrap">
                              {isAr ? "يستقبل حجوزات" : "Accepting"}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-alabaster-muted text-gray-600 border border-alabaster-border text-[10px] font-bold whitespace-nowrap">
                              {isAr ? "متوقف" : "Paused"}
                            </span>
                          )}
                          {doctor.availabilityWindows === 0 && (
                            <p className="text-[10px] text-amber-700 font-bold mt-1">
                              {isAr ? "لا توجد نوافذ عمل — لن يظهر في الحجز" : "No active windows — hidden in directory"}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Link
                            href={`/dashboard/admin/schedule?doctorId=${doctor.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200"
                          >
                            {isAr ? "إدارة الجدول" : "Manage Schedule"}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <Link
          href="/dashboard/admin/verification"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950"
        >
          {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          <span>{isAr ? "الانتقال لمكتب مراجعة المدفوعات" : "Go to Payment Verification Desk"}</span>
        </Link>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-start text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">
      {children}
    </th>
  );
}
