import type { Metadata } from "next";
import { getDoctorsAction } from "@/app/actions/doctors.actions";
import { HomeContent } from "@/components/home/HomeContent";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "مركز أسما للصحة النفسية | استشارات نفسية أونلاين وحضورية"
        : "Asmaa Mental Health Center | Online & In-Clinic Psychiatric Consultations",
    description:
      lang === "ar"
        ? "استشارات نفسية وعلاج معرفي سلوكي بإشراف نخبة من الاستشاريين المعتمدين. احجز جلسة أونلاين عبر زووم أو زيارة حضورية بمقر العيادة."
        : "Evidence-based psychiatric and clinical psychological consultations. Book an online Zoom consultation or in-person clinic visit in Cairo.",
  };
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await getDoctorsAction();
  const doctors = result.ok ? result.data : [];

  return <HomeContent doctors={doctors} />;
}
