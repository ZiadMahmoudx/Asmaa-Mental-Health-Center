import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  GraduationCap,
  Stethoscope,
  Video,
} from "lucide-react";
import { getDoctorsAction } from "@/app/actions/doctors.actions";
import { formatEgp } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "الأطباء والمعالجون | مركز أسما للصحة النفسية",
  description:
    "نخبة من استشاريي الطب النفسي وأخصائيي علم النفس الإكلينيكي. احجز جلسة أونلاين أو زيارة حضورية بالعيادة.",
};

/**
 * Consultant directory.
 *
 * Now a Server Component reading the real `DoctorProfile` table instead of the
 * `mockDoctors` array. Only the professional fields the clinic publishes are
 * selected in `getDoctorsAction` — the doctor's own email and phone never reach
 * the browser.
 */
export const dynamic = "force-dynamic";

export default async function TherapistsPage() {
  const result = await getDoctorsAction();

  if (!result.ok) {
    return (
      <div className="min-h-screen py-16 bg-alabaster-base">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-2">
          <h1 className="text-lg font-black text-crisis-dark">تعذّر تحميل قائمة الأطباء</h1>
          <p className="text-xs text-gray-600">{result.messageAr}</p>
        </div>
      </div>
    );
  }

  const doctors = result.data;

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-7">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-teal-950">
            الأطباء والمعالجون بالمركز
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
            نخبة من استشاريي الطب النفسي وأخصائيي علم النفس الإكلينيكي المعتمدين. اختر الاستشاري
            الأنسب لحالتك واحجز جلسة أونلاين عبر زووم أو زيارة حضورية بمقر العيادة.
          </p>
        </header>

        {doctors.length === 0 ? (
          <div className="bg-white rounded-3xl border border-alabaster-border p-12 text-center">
            <p className="text-sm text-gray-500 font-semibold">
              لا يوجد أطباء منشورون حالياً. يرجى التواصل مع إدارة المركز.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {doctors.map((doctor) => (
              <article
                key={doctor.id}
                className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-6 flex flex-col gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-7 h-7 text-teal-800" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-black text-teal-950">{doctor.fullName}</h2>
                      {doctor.isAcceptingPatients && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3" />
                          متاح
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-sage-800 leading-snug">
                      {doctor.title}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono" dir="ltr">
                      {doctor.licenseNumber}
                    </p>
                  </div>
                </div>

                {doctor.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {doctor.specialties.slice(0, 4).map((specialty) => (
                      <span
                        key={specialty}
                        className="px-2.5 py-1 rounded-lg bg-alabaster-muted text-[11px] font-semibold text-gray-700"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{doctor.bio}</p>

                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-sage-700" />
                    {doctor.yearsOfExperience} سنة خبرة
                  </span>
                  {doctor.offersOnline && (
                    <span className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-teal-700" />
                      أونلاين
                    </span>
                  )}
                  {doctor.offersOffline && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-sage-700" />
                      بالعيادة
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-alabaster-border flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] text-gray-400 font-bold">
                      تبدأ الجلسة من
                    </span>
                    <span className="text-base font-black text-teal-900">
                      {formatEgp(Math.min(doctor.priceOnlineEGP, doctor.priceOfflineEGP))}
                    </span>
                  </div>

                  <Link
                    href={`/booking/${doctor.id}`}
                    className="px-5 py-2.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-extrabold transition flex items-center gap-1.5"
                  >
                    احجز موعد
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
