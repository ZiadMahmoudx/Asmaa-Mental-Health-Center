import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, GraduationCap, Stethoscope } from "lucide-react";
import { getDoctorAction } from "@/app/actions/doctors.actions";
import { getAuthContext } from "@/lib/auth/session";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { bookingPolicy } from "@/lib/clinic-config";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}): Promise<Metadata> {
  const { doctorId } = await params;
  const [doctorResult, lang] = await Promise.all([getDoctorAction(doctorId), getLanguage()]);

  if (!doctorResult.ok) {
    return {
      title: lang === "ar" ? "حجز جلسة | مركز أسما" : "Book Session | Asmaa Center",
    };
  }

  const doctor = doctorResult.data;
  return {
    title:
      lang === "ar"
        ? `حجز موعد مع ${doctor.fullName} | مركز أسما للصحة النفسية`
        : `Book Appointment with ${doctor.fullName} | Asmaa Mental Health Center`,
    description:
      lang === "ar"
        ? `اختر موعد جلستك مع ${doctor.fullName} (${doctor.title}) أونلاين عبر زووم أو زيارة بالعيادة.`
        : `Select your consultation slot with ${doctor.fullName} (${doctor.titleEn ?? doctor.title}) via Zoom or in-clinic.`,
  };
}

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  const { doctorId } = await params;

  const [doctorResult, auth, csrfToken, lang] = await Promise.all([
    getDoctorAction(doctorId),
    getAuthContext(),
    ensureCsrfToken(),
    getLanguage(),
  ]);

  if (!doctorResult.ok) notFound();
  const doctor = doctorResult.data;
  const isAr = lang === "ar";
  const BackIcon = isAr ? ArrowLeft : ArrowRight;

  const title = isAr ? doctor.title : doctor.titleEn ?? doctor.title;
  const bio = isAr ? doctor.bio : doctor.bioEn ?? doctor.bio;
  const specialties = isAr
    ? doctor.specialties
    : doctor.specialtiesEn.length > 0
    ? doctor.specialtiesEn
    : doctor.specialties;

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <Link
          href="/therapists"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950"
        >
          <BackIcon className="w-3.5 h-3.5" />
          <span>{isAr ? "العودة لقائمة الأطباء" : "Back to Consultants"}</span>
        </Link>

        {/* Consultant header */}
        <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
              <Stethoscope className="w-8 h-8 text-teal-800" />
            </div>

            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-teal-950">{doctor.fullName}</h1>
                {doctor.isAcceptingPatients ? (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" />
                    <span>{isAr ? "يستقبل حجوزات" : "Accepting Patients"}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                    {isAr ? "لا يستقبل حجوزات حالياً" : "Currently Fully Booked"}
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-sage-800">{title}</p>

              <p className="text-[11px] text-gray-400 font-mono" dir="ltr">
                {doctor.licenseNumber}
              </p>

              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="px-2.5 py-1 rounded-lg bg-alabaster-muted text-[11px] font-semibold text-gray-700"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-600 leading-relaxed pt-1 max-w-2xl">{bio}</p>

              <p className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-1">
                <GraduationCap className="w-3.5 h-3.5 text-sage-700" />
                <span>
                  {doctor.yearsOfExperience} {isAr ? "سنة خبرة إكلينيكية" : "years clinical experience"}
                </span>
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
