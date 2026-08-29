import { Suspense } from "react";
import type { Metadata } from "next";
import { getDoctorsAction } from "@/app/actions/doctors.actions";
import { TherapistsDirectory } from "@/components/therapists/TherapistsDirectory";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "الأطباء والمعالجون | مركز أسما للصحة النفسية"
        : "Psychiatrists & Clinical Therapists | Asmaa Mental Health Center",
    description:
      lang === "ar"
        ? "نخبة من استشاريي الطب النفسي وأخصائيي علم النفس الإكلينيكي. احجز جلسة أونلاين أو زيارة حضورية بالعيادة."
        : "Board-certified psychiatrists and clinical psychologists. Book confidential online Zoom consultations or clinic sessions.",
  };
}

export const dynamic = "force-dynamic";

export default async function TherapistsPage() {
  const result = await getDoctorsAction();

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Suspense
          fallback={
            <div className="space-y-6 animate-pulse">
              <div className="h-8 bg-gray-200 rounded-2xl w-1/3" />
              <div className="h-4 bg-gray-200 rounded-xl w-2/3" />
              <div className="h-20 bg-white rounded-3xl border border-alabaster-border" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-64 bg-white rounded-3xl border border-alabaster-border" />
                <div className="h-64 bg-white rounded-3xl border border-alabaster-border" />
              </div>
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
                    en: result.messageEn ?? result.messageAr,
                  }
            }
          />
        </Suspense>
      </div>
    </div>
  );
}
