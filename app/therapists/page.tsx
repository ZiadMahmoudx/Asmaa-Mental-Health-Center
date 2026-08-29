import type { Metadata } from "next";
import { getDoctorsAction } from "@/app/actions/doctors.actions";
import { TherapistsDirectory } from "@/components/therapists/TherapistsDirectory";

export const metadata: Metadata = {
  title: "الأطباء والمعالجون | مركز أسما للصحة النفسية",
  description:
    "نخبة من استشاريي الطب النفسي وأخصائيي علم النفس الإكلينيكي. احجز جلسة أونلاين أو زيارة حضورية بالعيادة.",
};

/**
 * Consultant directory.
 *
 * Server shell reading the real `DoctorProfile` table. It hands off to
 * the client `TherapistsDirectory` component to support live search,
 * multi-criteria filtering, and bilingual language switching.
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

        <TherapistsDirectory doctors={doctors} />
      </div>
    </div>
  );
}
