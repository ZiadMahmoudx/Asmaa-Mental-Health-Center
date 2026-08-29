import { Suspense } from "react";
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
 * the client `TherapistsDirectory` component with full bilingual header,
 * live search, multi-criteria filtering, and URL synchronization.
 */
export const dynamic = "force-dynamic";

export default async function TherapistsPage() {
  const result = await getDoctorsAction();

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Suspense
          fallback={
            <div className="p-12 text-center text-xs text-gray-500 font-bold">
              جاري تحميل قائمة الأطباء والمعالجين...
            </div>
          }
        >
          <TherapistsDirectory
            doctors={result.ok ? result.data : null}
            errorMessage={
              result.ok
                ? undefined
                : {
                    ar: result.messageAr,
                    en: result.messageEn,
                  }
            }
          />
        </Suspense>
      </div>
    </div>
  );
}
