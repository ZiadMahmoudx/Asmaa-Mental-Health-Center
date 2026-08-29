import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  CalendarPlus,
  Coins,
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
import { getPatientCreditBalanceAction } from "@/app/actions/credits.actions";
import { getMyAssessmentsAction } from "@/app/actions/assessments.actions";
import { getClinicConfig } from "@/lib/clinic-config";
import { formatCairo, formatEgp } from "@/lib/whatsapp";
import { PatientAppointments } from "@/components/dashboard/PatientAppointments";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "بوابة المريض | مركز أسما للصحة النفسية"
        : "Patient Portal | Asmaa Mental Health Center",
    description:
      lang === "ar"
        ? "مواعيدك، تقاريرك الطبية، نتائج المقاييس، وأدوات الدعم النفسي في مكان واحد."
        : "Manage your consultations, clinical records, assessment screenings, and support tools in one secure portal.",
  };
}

export const dynamic = "force-dynamic";

export default async function PatientDashboardPage() {
  const [auth, lang] = await Promise.all([
    requireRolePage(["PATIENT"], "/dashboard/patient"),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  const [appointmentsResult, recordsResult, creditResult, assessmentsResult, csrfToken] =
    await Promise.all([
      getMyAppointmentsAction(),
      getMyClinicalRecordsAction(),
      getPatientCreditBalanceAction(),
      getMyAssessmentsAction(),
      readCsrfToken(),
    ]);

  const clinic = getClinicConfig();
  const appointments = appointmentsResult.ok ? appointmentsResult.data : [];
  const records = recordsResult.ok ? recordsResult.data : [];
  const assessments = assessmentsResult.ok ? assessmentsResult.data : [];
  const creditBalance = creditResult.ok ? creditResult.data.balanceEGP : 0;
  const creditEntries = creditResult.ok ? creditResult.data.entries : [];

  const nextSession = appointments
    .filter(
      (item) => item.status === "CONFIRMED" && new Date(item.scheduledAtUTC).getTime() > Date.now(),
    )
    .sort((a, b) => a.scheduledAtUTC.localeCompare(b.scheduledAtUTC))[0];

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        {/* Header */}
        <header className="bg-teal-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black">
              {isAr ? `أهلاً ${auth.user.fullName}` : `Welcome back, ${auth.user.fullName}`}
            </h1>
            <p className="text-xs text-teal-300">
              {nextSession
                ? isAr
                  ? `جلستك القادمة: ${formatCairo(new Date(nextSession.scheduledAtUTC))} مع ${nextSession.doctorName}`
                  : `Next session: ${formatCairo(new Date(nextSession.scheduledAtUTC))} with ${nextSession.doctorName}`
                : isAr
                ? "لا توجد جلسات مؤكدة قادمة حالياً."
                : "No upcoming confirmed sessions scheduled."}
            </p>
            <p className="text-[11px] text-teal-400 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {isAr
                  ? "بياناتك الصحية سرية ولا يطّلع عليها سوى فريقك العلاجي."
                  : "Your clinical records are confidential and accessible only to your care team."}
              </span>
            </p>
          </div>

          <Link
            href="/therapists"
            className="px-5 py-3 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-extrabold transition flex items-center gap-2 shrink-0 shadow-sm"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>{isAr ? "حجز جلسة جديدة" : "Book New Session"}</span>
          </Link>
        </header>

        {/* Credit Balance Card */}
        {creditBalance > 0 && (
          <div className="bg-white border border-teal-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-teal-950">
                    {isAr ? "رصيدك المالي المتاح لدى المركز" : "Available Wallet Balance"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAr
                      ? "رصيد لك لدى المركز، يمكن استخدامه في حجز قادم أو استرداده عبر التحويل."
                      : "Clinic credit available to apply toward future appointments or bank settlement."}
                  </p>
                </div>
              </div>

              <div className="text-start sm:text-end">
                <span className="text-2xl font-black font-mono text-teal-800">
                  {formatEgp(creditBalance)}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {isAr ? "رصيد مالي صالح للاستخدام" : "Active booking credit"}
                </span>
              </div>
            </div>

            {/* Ledger Disclosure */}
            {creditEntries.length > 0 && (
              <details className="text-xs group border-t border-slate-100 pt-3">
                <summary className="font-bold text-teal-800 cursor-pointer hover:underline list-none flex items-center gap-1">
                  <span>
                    {isAr
                      ? `عرض تفاصيل حركات الرصيد (${creditEntries.length})`
                      : `View transaction ledger entries (${creditEntries.length})`}
                  </span>
                </summary>
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {creditEntries.map((e) => (
                    <div
                      key={e.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-800">
                          {e.kind === "CANCELLATION"
                            ? isAr
                              ? "إلغاء جلسة"
                              : "Session Cancellation"
                            : e.kind === "MANUAL_ADJUSTMENT"
                            ? isAr
                              ? "تعديل رصيد"
                              : "Manual Adjustment"
                            : e.kind === "PAID_OUT"
                            ? isAr
                              ? "تحويل بنكي / تسوية"
                              : "Settlement Payout"
                            : isAr
                            ? "استخدام في حجز"
                            : "Booking Applied"}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatCairo(new Date(e.createdAtUTC))} {e.reason ? `• ${e.reason}` : ""}
                        </div>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs ${
                          e.amountEGP > 0 ? "text-emerald-700" : "text-slate-700"
                        }`}
                      >
                        {e.amountEGP > 0 ? `+${formatEgp(e.amountEGP)}` : formatEgp(e.amountEGP)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Appointments */}
        <section className="space-y-4">
          <h2 className="text-base font-black text-teal-950">
            {isAr ? "مواعيدي" : "My Consultations"}
          </h2>
          {appointmentsResult.ok ? (
            <PatientAppointments
              appointments={appointments}
              csrfToken={csrfToken}
              clinicAddressAr={clinic.addressAr}
              clinicMapsUrl={clinic.mapsUrl}
            />
          ) : (
            <p className="p-4 rounded-2xl bg-crisis-light border border-crisis/20 text-xs font-bold text-crisis-dark">
              {isAr ? appointmentsResult.messageAr : appointmentsResult.messageEn ?? appointmentsResult.messageAr}
            </p>
          )}
        </section>

        {/* Clinical records */}
        <section className="space-y-4">
          <h2 className="text-base font-black text-teal-950">
            {isAr ? "تقاريري الطبية والخطة العلاجية" : "Clinical Records & Treatment Plans"}
          </h2>

          {records.length === 0 ? (
            <div className="bg-white rounded-3xl border border-alabaster-border p-8 text-center">
              <FileText className="w-9 h-9 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-semibold">
                {isAr
                  ? "لا توجد تقارير بعد. يكتب طبيبك التقرير بعد الجلسة ويظهر لك هنا."
                  : "No clinical reports on file yet. Your consultant records diagnosis and treatment plans following sessions."}
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
                    <Field label={isAr ? "الشكوى الرئيسية" : "Chief Complaint"} value={record.chiefComplaint} />
                  )}
                  <Field label={isAr ? "التشخيص الإكلينيكي" : "Diagnosis"} value={record.diagnosis} />
                  {record.prescriptionNotes && (
                    <Field label={isAr ? "الخطة الدوائية والعلاجية" : "Treatment & Medication Plan"} value={record.prescriptionNotes} />
                  )}
                  {record.followUpPlan && (
                    <Field label={isAr ? "خطة المتابعة" : "Follow-up Plan"} value={record.followUpPlan} />
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
                      {isAr ? "تقرير موقّع إلكترونياً من الطبيب المعالج" : "Digitally signed by treating consultant"}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Clinical Assessments */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-teal-950 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-800" />
              <span>{isAr ? "نتائج مقاييسي النفسية" : "My Assessment Results"}</span>
            </h2>
            <Link
              href="/assessments"
              className="text-xs font-bold text-teal-800 hover:underline"
            >
              {isAr ? "إجراء مقياس جديد ←" : "Take New Assessment →"}
            </Link>
          </div>

          {assessments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-alabaster-border p-8 text-center space-y-2">
              <Activity className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-500 font-semibold">
                {isAr ? "لم تقم بإجراء أي مقاييس نفسية معتمدة بعد." : "No clinical screening assessments completed yet."}
              </p>
              <Link
                href="/assessments"
                className="inline-block mt-2 px-4 py-2 bg-teal-800 text-white text-xs font-bold rounded-xl hover:bg-teal-900 shadow-sm"
              >
                {isAr ? "بدء التقييم السريري" : "Start Screening"}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assessments.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black text-slate-900">
                        {isAr ? item.titleAr : item.titleEn}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {formatCairo(new Date(item.completedAtUTC))}
                      </p>
                    </div>
                    <span className="text-xs font-black font-mono text-teal-900 tabular-nums">
                      {item.totalScore}/{item.maxScore}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-[10px] font-bold">
                      {isAr ? item.labelAr : item.labelEn}
                    </span>
                    {item.riskItemEndorsed && (
                      <span className="px-2 py-0.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                        {isAr ? "مؤشر أمان" : "Safety Flag"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Self-help tools */}
        <section className="space-y-4">
          <h2 className="text-base font-black text-teal-950">
            {isAr ? "أدوات الدعم النفسي الذاتي" : "Self-Help Clinical Tools"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                href: "/assessments",
                label: isAr ? "المقاييس النفسية" : "Screening Scales",
                sub: isAr ? "8 مقاييس معتمدة" : "8 Validated Tools",
                icon: Activity,
              },
              {
                href: "/safety-plan",
                label: isAr ? "خطة الأمان النفسي" : "Safety Plan",
                sub: "Stanley-Brown",
                icon: HeartPulse,
              },
              {
                href: "/intake",
                label: isAr ? "الاستبيان الطبي" : "Clinical Triage",
                sub: isAr ? "توجيه للاستشاري" : "Find Best Match",
                icon: Stethoscope,
              },
              {
                href: "/emergency",
                label: isAr ? "الطوارئ والتهدئة" : "Crisis & Calming",
                sub: isAr ? "تنفس وتأريض" : "Grounding Tools",
                icon: Headphones,
              },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="bg-white rounded-2xl border border-alabaster-border p-4 hover:border-sage-400 transition space-y-1.5 shadow-xs"
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
