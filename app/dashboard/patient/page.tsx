import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  CalendarPlus,
  FileText,
  Headphones,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getMyAppointmentsAction } from "@/app/actions/booking.actions";
import { getMyClinicalRecordsAction } from "@/app/actions/records.actions";
import { getClinicConfig } from "@/lib/clinic-config";
import { formatCairo } from "@/lib/whatsapp";
import { PatientAppointments } from "@/components/dashboard/PatientAppointments";

export const metadata: Metadata = {
  title: "بوابة المريض | مركز أسما للصحة النفسية",
  description: "مواعيدك، تقاريرك الطبية، وأدوات الدعم النفسي في مكان واحد.",
};

/**
 * Patient portal.
 *
 * Rebuilt as a Server Component over real data. The previous version read
 * appointments and clinical records out of a React context backed by
 * `localStorage`, which meant a patient's own record could be edited from the
 * browser console. Everything shown here is fetched per request, scoped to the
 * session's user id at the database layer.
 *
 * The wallet, top-up and promo-code surfaces are deliberately gone: Phase 1
 * settles fees by manual InstaPay / Vodafone Cash transfer, so a simulated
 * balance would misrepresent what the clinic can actually honour. The self-help
 * tools that genuinely work standalone are linked below.
 */
export const dynamic = "force-dynamic";

export default async function PatientDashboardPage() {
  const auth = await requireRolePage(["PATIENT"], "/dashboard/patient");

  const [appointmentsResult, recordsResult, csrfToken] = await Promise.all([
    getMyAppointmentsAction(),
    getMyClinicalRecordsAction(),
    readCsrfToken(),
  ]);

  const clinic = getClinicConfig();
  const appointments = appointmentsResult.ok ? appointmentsResult.data : [];
  const records = recordsResult.ok ? recordsResult.data : [];

  const nextSession = appointments
    .filter(
      (item) => item.status === "CONFIRMED" && new Date(item.scheduledAtUTC).getTime() > Date.now(),
    )
    .sort((a, b) => a.scheduledAtUTC.localeCompare(b.scheduledAtUTC))[0];

  const awaitingAction = appointments.filter(
    (item) => item.status === "PENDING_PAYMENT_PROOF" || item.status === "REJECTED",
  ).length;

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        {/* Header */}
        <header className="bg-teal-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black">أهلاً {auth.user.fullName}</h1>
            <p className="text-xs text-teal-300">
              {nextSession
                ? `جلستك القادمة: ${formatCairo(new Date(nextSession.scheduledAtUTC))} مع ${nextSession.doctorName}`
                : "لا توجد جلسات مؤكدة قادمة حالياً."}
            </p>
            <p className="text-[11px] text-teal-400 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              بياناتك الصحية سرية ولا يطّلع عليها سوى فريقك العلاجي.
            </p>
          </div>

          <Link
            href="/therapists"
            className="px-5 py-3 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-extrabold transition flex items-center gap-2 shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            حجز جلسة جديدة
          </Link>
        </header>

        {awaitingAction > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
            لديك {awaitingAction} حجز بانتظار رفع إيصال الدفع. الموعد محجوز لك مؤقتاً فقط.
          </div>
        )}

        {/* Appointments */}
        <section className="space-y-4">
          <h2 className="text-base font-black text-teal-950">مواعيدي</h2>
          {appointmentsResult.ok ? (
            <PatientAppointments
              appointments={appointments}
              csrfToken={csrfToken}
              clinicAddressAr={clinic.addressAr}
              clinicMapsUrl={clinic.mapsUrl}
            />
          ) : (
            <p className="p-4 rounded-2xl bg-crisis-light border border-crisis/20 text-xs font-bold text-crisis-dark">
              {appointmentsResult.messageAr}
            </p>
          )}
        </section>

        {/* Clinical records */}
        <section className="space-y-4">
          <h2 className="text-base font-black text-teal-950">تقاريري الطبية</h2>

          {records.length === 0 ? (
            <div className="bg-white rounded-3xl border border-alabaster-border p-8 text-center">
              <FileText className="w-9 h-9 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-semibold">
                لا توجد تقارير بعد. يكتب طبيبك التقرير بعد الجلسة ويظهر لك هنا.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {records.map((record) => (
                <li
                  key={record.id}
                  className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-sm font-extrabold text-teal-950 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-sage-700" />
                      {record.doctorName}
                    </h3>
                    <span className="text-[11px] text-gray-500">
                      {formatCairo(new Date(record.sessionAtUTC))}
                    </span>
                  </div>

                  {record.chiefComplaint && (
                    <Field label="الشكوى الرئيسية" value={record.chiefComplaint} />
                  )}
                  <Field label="التشخيص" value={record.diagnosis} />
                  {record.prescriptionNotes && (
                    <Field label="الخطة الدوائية" value={record.prescriptionNotes} />
                  )}
                  {record.followUpPlan && (
                    <Field label="خطة المتابعة" value={record.followUpPlan} />
                  )}

                  {record.dsm5Codes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {record.dsm5Codes.map((code) => (
                        <span
                          key={code}
                          className="px-2 py-0.5 rounded-lg bg-alabaster-muted text-[10px] font-mono text-gray-700"
                          dir="ltr"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  )}

                  {record.signedAtUTC && (
                    <p className="text-[10px] text-emerald-700 font-bold pt-1">
                      تقرير موقّع إلكترونياً من الطبيب المعالج
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Self-help tools */}
        <section className="space-y-4">
          <h2 className="text-base font-black text-teal-950">أدوات الدعم النفسي</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: "/assessments", label: "المقاييس النفسية", sub: "PHQ-9 · GAD-7", icon: Activity },
              { href: "/safety-plan", label: "خطة الأمان النفسي", sub: "Stanley-Brown", icon: HeartPulse },
              { href: "/audio", label: "الصوتيات الإرشادية", sub: "تمارين تهدئة", icon: Headphones },
              { href: "/books", label: "مكتبة التعافي", sub: "كتب ومراجع", icon: BookOpen },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="bg-white rounded-2xl border border-alabaster-border p-4 hover:border-sage-400 transition space-y-1.5"
                >
                  <Icon className="w-5 h-5 text-sage-700" />
                  <p className="text-xs font-extrabold text-teal-950">{tool.label}</p>
                  <p className="text-[10px] text-gray-500">{tool.sub}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] text-gray-400 font-bold mb-0.5">{label}</span>
      <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-line">{value}</p>
    </div>
  );
}
