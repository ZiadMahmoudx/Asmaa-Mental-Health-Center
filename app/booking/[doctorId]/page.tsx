import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, GraduationCap, Stethoscope } from "lucide-react";
import { getDoctorAction } from "@/app/actions/doctors.actions";
import { getAuthContext } from "@/lib/auth/session";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { bookingPolicy } from "@/lib/clinic-config";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "حجز جلسة | مركز أسما للصحة النفسية",
  description: "اختر موعد جلستك أونلاين أو حضورياً بالعيادة وأكمل الحجز بالتحويل عبر إنستا باي أو فودافون كاش.",
};

/**
 * Booking page.
 *
 * Server shell: it loads the consultant, resolves the session, and mints the
 * CSRF token, then hands all of it to the client flow as props. Availability
 * itself is fetched by the client, because it changes with the consultation type
 * the patient picks and must reflect other patients' bookings at the moment of
 * selection rather than at the moment the page was rendered.
 */
export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  const { doctorId } = await params;

  const [doctorResult, auth, csrfToken] = await Promise.all([
    getDoctorAction(doctorId),
    getAuthContext(),
    ensureCsrfToken(),
  ]);

  if (!doctorResult.ok) notFound();
  const doctor = doctorResult.data;

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <Link
          href="/therapists"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>العودة لقائمة الأطباء</span>
        </Link>

        {/* Consultant header */}
        <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
              <Stethoscope className="w-8 h-8 text-teal-800" />
            </div>

            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-teal-950">{doctor.fullName}</h1>
                {doctor.isAcceptingPatients ? (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" />
                    يستقبل حجوزات
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                    لا يستقبل حجوزات حالياً
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-sage-800">{doctor.title}</p>

              <p className="text-[11px] text-gray-400 font-mono" dir="ltr">
                {doctor.licenseNumber}
              </p>

              {doctor.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {doctor.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="px-2.5 py-1 rounded-lg bg-alabaster-muted text-[11px] font-semibold text-gray-700"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-600 leading-relaxed pt-1 max-w-2xl">{doctor.bio}</p>

              <p className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-1">
                <GraduationCap className="w-3.5 h-3.5 text-sage-700" />
                {doctor.yearsOfExperience} سنة خبرة إكلينيكية
              </p>
            </div>
          </div>
        </div>

        <BookingFlow
          doctor={doctor}
          csrfToken={csrfToken}
          isAuthenticated={Boolean(auth)}
          holdMinutes={bookingPolicy.holdMinutes}
        />
      </div>
    </div>
  );
}
