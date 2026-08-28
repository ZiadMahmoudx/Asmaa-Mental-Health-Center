import type { Metadata } from "next";
import { getClinicConfig } from "@/lib/clinic-config";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { FAQContent } from "@/components/faq/FAQContent";

export const metadata: Metadata = {
  title: "ميثاق السرية والأسئلة الشائعة | مركز أسما للصحة النفسية",
  description: "إجابات عن السرية الطبية، طرق الدفع، أنواع الجلسات، وسياسة الإلغاء في مركز أسما للصحة النفسية.",
};

/**
 * FAQ. A server shell so the clinic's real WhatsApp number can come from the
 * environment rather than being hard-coded into the page.
 */
export const dynamic = "force-dynamic";

export default function FAQPage() {
  const clinic = getClinicConfig();

  return (
    <FAQContent
      clinicWhatsappUrl={buildWhatsAppLink(
        clinic.whatsappNumber,
        "مرحباً، لدي استفسار بخصوص خدمات مركز أسما للصحة النفسية.",
      )}
    />
  );
}
