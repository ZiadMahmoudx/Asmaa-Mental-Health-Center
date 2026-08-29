import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { IntakeWizard } from "@/components/clinical/IntakeWizard";
import { isConcernTag } from "@/lib/content/intake";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "الاستبيان الطبي الذكي | مركز أسما للصحة النفسية"
        : "Smart Clinical Triage | Asmaa Mental Health Center",
    description:
      lang === "ar"
        ? "استبيان فرز إكلينيكي قصير يوجّهك للاستشاري الأنسب لحالتك داخل مركز أسما للصحة النفسية."
        : "A brief 3-minute clinical intake triage to guide you to the most suitable consultant psychiatrist or therapist.",
  };
}

export const dynamic = "force-dynamic";

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ concern?: string }>;
}) {
  const [auth, csrfToken, lang, params] = await Promise.all([
    getAuthContext(),
    ensureCsrfToken(),
    getLanguage(),
    searchParams,
  ]);
  const isAr = lang === "ar";

  const initialConcern =
    typeof params?.concern === "string" && isConcernTag(params.concern)
      ? params.concern
      : null;

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-teal-950">
            {isAr ? "الاستبيان الطبي الذكي" : "Smart Clinical Triage"}
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            {isAr
              ? "أربع خطوات قصيرة (٣ دقائق) نفهم من خلالها ما تمر به، لنوجّهك للاستشاري الأنسب لحالتك بدل أن تختار من قائمة طويلة."
              : "Four brief steps (3 minutes) to help us understand what you are experiencing and match you with the right specialist."}
          </p>
          <p className="text-[11px] text-sage-800 flex items-center gap-1.5 pt-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-sage-700" />
            <span>
              {isAr
                ? "إجاباتك سرية تماماً ولا يطّلع عليها سوى الفريق الطبي بالمركز."
                : "Your answers are strictly confidential and accessible only to your treating clinical faculty."}
            </span>
          </p>
        </header>

        <IntakeWizard
          csrfToken={csrfToken}
          isAuthenticated={Boolean(auth)}
          initialConcern={initialConcern}
        />
      </div>
    </div>
  );
}
