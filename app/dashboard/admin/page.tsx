import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
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
import { getFlaggedIntakesAction } from "@/app/actions/intake.actions";
import { formatCairo, formatEgp } from "@/lib/whatsapp";
import { CrisisIntakeQueue } from "@/components/admin/CrisisIntakeQueue";

export const metadata: Metadata = {
  title: "لوحة الإدارة | مركز أسما للصحة النفسية",
  description: "مؤشرات التشغيل، قائمة الاستشاريين، وحالات الفرز العاجلة.",
};

/**
 * Admin overview.
 *
 * Every number on this page is a query against the live database. The version
 * this replaces displayed hard-coded literals, which looked like reporting but
 * could not be acted on. Where the platform does not yet collect a metric —
 * patient satisfaction ratings, for example — it is simply not shown rather
 * than fabricated.
 */
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireRolePage(["ADMIN"], "/dashboard/admin");

  const [metricsResult, rosterResult, intakesResult, csrfToken] = await Promise.all([
    getClinicMetricsAction(),
    getDoctorRosterAction(),
    getFlaggedIntakesAction(10),
    readCsrfToken(),
  ]);

  if (!metricsResult.ok) {
    return (
      <div className="min-h-screen py-16 bg-alabaster-base">
        <div className="max-w-lg mx-auto px-4 text-center space-y-2">
          <h1 className="text-lg font-black text-crisis-dark">تعذّر تحميل مؤشرات المركز</h1>
          <p className="text-xs text-gray-600">{metricsResult.messageAr}</p>
        </div>
      </div>
    );
  }

  const metrics = metricsResult.data;
  const roster = rosterResult.ok ? rosterResult.data : [];
  const flaggedIntakes = intakesResult.ok ? intakesResult.data : [];
  const unreviewedFlagged = flaggedIntakes.filter((intake) => !intake.reviewedAtUTC);

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        <header className="bg-teal-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black">لوحة إدارة المركز</h1>
            <p className="text-xs text-teal-300">
              مؤشرات تشغيلية محدّثة لحظياً من قاعدة البيانات
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/admin/staff"
              className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 border border-teal-700"
            >
              <Users className="w-4 h-4" />
              إدارة طاقم العمل
            </Link>
            <Link
              href="/dashboard/admin/appointments"
              className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 border border-teal-700"
            >
              <CalendarCheck className="w-4 h-4" />
              سجل الحجوزات
            </Link>
            <Link
              href="/dashboard/admin/schedule"
              className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 border border-teal-700"
            >
              <Clock3 className="w-4 h-4" />
              إدارة جداول الأطباء
            </Link>
            <Link
              href="/dashboard/admin/credits"
              className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 border border-teal-700"
            >
              <Coins className="w-4 h-4" />
              أرصدة المرضى
            </Link>
            <Link
              href="/dashboard/admin/reminders"
              className="px-4 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 border border-teal-700"
            >
              <BellRing className="w-4 h-4" />
              تذكيرات الجلسات
            </Link>
            <Link
              href="/dashboard/admin/verification"
              className="px-4 py-2.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 shadow-sm"
            >
              <Receipt className="w-4 h-4" />
              مكتب مراجعة المدفوعات
              {metrics.pendingReceipts > 0 && (
                <span className="px-1.5 py-0.5 rounded-lg bg-white text-terracotta-700 text-[10px] font-black">
                  {metrics.pendingReceipts}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Things that need a human today */}
        {(metrics.pendingReceipts > 0 || unreviewedFlagged.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {metrics.pendingReceipts > 0 && (
              <Link
                href="/dashboard/admin/verification"
                className="p-5 rounded-3xl bg-amber-50 border border-amber-200 hover:border-amber-400 transition flex items-center gap-4"
              >
                <Receipt className="w-8 h-8 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-black text-amber-900">
                    {metrics.pendingReceipts} إيصال بانتظار المراجعة
                  </p>
                  <p className="text-[11px] text-amber-800">
                    كل إيصال يمثل مريضاً ينتظر تأكيد حجزه.
                  </p>
                </div>
              </Link>
            )}

            {unreviewedFlagged.length > 0 && (
              <div className="p-5 rounded-3xl bg-crisis-light border border-crisis/30 flex items-center gap-4">
                <ShieldAlert className="w-8 h-8 text-crisis shrink-0" />
                <div>
                  <p className="text-sm font-black text-crisis-dark">
                    {unreviewedFlagged.length} حالة فرز عاجلة
                  </p>
                  <p className="text-[11px] text-crisis-dark">
                    مرضى أشاروا لأفكار إيذاء النفس ولم تتم مراجعتهم بعد.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Operational metrics */}
        <section className="space-y-3">
          <h2 className="text-base font-black text-teal-950">مؤشرات التشغيل</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric icon={CheckCircle2} label="جلسات مكتملة" value={String(metrics.completedSessions)} />
            <Metric icon={CalendarCheck} label="جلسات مؤكدة قادمة" value={String(metrics.confirmedUpcoming)} />
            <Metric icon={Clock3} label="حجوزات بانتظار الدفع" value={String(metrics.openHolds)} tone={metrics.openHolds > 0 ? "warn" : undefined} />
            <Metric icon={Users} label="مرضى مسجّلون" value={String(metrics.activePatients)} />
            <Metric icon={Stethoscope} label="استشاريون نشطون" value={`${metrics.acceptingDoctors} / ${metrics.activeDoctors}`} />
            <Metric icon={CalendarCheck} label="جلسات آخر 30 يوماً" value={String(metrics.sessionsLast30Days)} />
            <Metric icon={Banknote} label="إيراد الجلسات المكتملة" value={formatEgp(metrics.completedRevenueEGP)} />
            <Metric icon={Banknote} label="إيراد مؤكد قادم" value={formatEgp(metrics.confirmedPipelineEGP)} />
          </div>
        </section>

        {/* Delivery mix */}
        <section className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-extrabold text-teal-950">توزيع نوع الجلسات</h2>
          {metrics.onlineShare + metrics.offlineShare === 0 ? (
            <p className="text-xs text-gray-500">لا توجد جلسات مؤكدة بعد لحساب التوزيع.</p>
          ) : (
            <div className="space-y-3">
              <ShareBar
                icon={Video}
                label="أونلاين عبر زووم"
                percent={metrics.onlineShare}
                className="bg-teal-700"
              />
              <ShareBar
                icon={Building2}
                label="حضورية بالعيادة"
                percent={metrics.offlineShare}
                className="bg-sage-600"
              />
            </div>
          )}
        </section>

        {/* Crisis triage queue */}
        <section className="space-y-3">
          <h2 className="text-base font-black text-teal-950 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-crisis" />
            حالات الفرز العاجلة
          </h2>
          <CrisisIntakeQueue intakes={flaggedIntakes} csrfToken={csrfToken} />
        </section>

        {/* Roster */}
        <section className="space-y-3">
          <h2 className="text-base font-black text-teal-950">الاستشاريون وأحمال العمل</h2>

          {roster.length === 0 ? (
            <div className="bg-white rounded-3xl border border-alabaster-border p-10 text-center">
              <p className="text-sm text-gray-500 font-semibold">لا يوجد استشاريون مسجّلون.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[720px]">
                  <thead className="bg-alabaster-base text-gray-500">
                    <tr>
                      <Th>الاستشاري</Th>
                      <Th>الترخيص</Th>
                      <Th>نوافذ العمل</Th>
                      <Th>جلسات قادمة</Th>
                      <Th>جلسات مكتملة</Th>
                      <Th>السعر (أونلاين / عيادة)</Th>
                      <Th>الحالة</Th>
                      <Th>الإجراء</Th>
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
                              يستقبل حجوزات
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-alabaster-muted text-gray-600 border border-alabaster-border text-[10px] font-bold whitespace-nowrap">
                              متوقف
                            </span>
                          )}
                          {doctor.availabilityWindows === 0 && (
                            <p className="text-[10px] text-amber-700 font-bold mt-1">
                              لا توجد نوافذ عمل — لن يظهر في الحجز
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Link
                            href={`/dashboard/admin/schedule?doctorId=${doctor.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200"
                          >
                            إدارة الجدول
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
          <ArrowLeft className="w-3.5 h-3.5" />
          الانتقال لمكتب مراجعة المدفوعات
        </Link>
      </div>
    </div>
  );
}

function Metric({
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
      <p className="text-[10px] text-gray-400 font-bold leading-snug">{label}</p>
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

function ShareBar({
  icon: Icon,
  label,
  percent,
  className,
}: {
  icon: typeof Video;
  label: string;
  percent: number;
  className: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-gray-700 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-sage-700" />
          {label}
        </span>
        <span className="font-black text-teal-950 tabular-nums">{percent}%</span>
      </div>
      <div className="h-2 bg-alabaster-muted rounded-full overflow-hidden">
        <div className={`h-full ${className}`} style={{ width: `${percent}%` }} />
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
