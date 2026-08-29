import type { Metadata } from "next";
import { getClinicConfig } from "@/lib/clinic-config";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { FAQContent } from "@/components/faq/FAQContent";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "ميثاق السرية والأسئلة الشائعة | مركز أسما للصحة النفسية"
        : "Clinical FAQ & Privacy Standards | Asmaa Mental Health Center",
    description:
      lang === "ar"
        ? "إجابات عن السرية الطبية، طرق الدفع، أنواع الجلسات، وسياسة الإلغاء في مركز أسما للصحة النفسية."
        : "Frequently asked questions regarding telepsychiatry consultations, medical confidentiality, payments, and clinic policies.",
  };
}

export const dynamic = "force-dynamic";

export default async function FAQPage() {
  const [lang] = await Promise.all([getLanguage()]);
  const clinic = getClinicConfig();

  return (
    <FAQContent
      clinicWhatsappUrl={buildWhatsAppLink(
        clinic.whatsappNumber,
        lang === "ar"
          ? "مرحباً، لدي استفسار بخصوص خدمات مركز أسما للصحة النفسية."
          : "Hello, I have an inquiry regarding Asmaa Mental Health Center services.",
      )}
    />
  );
}
