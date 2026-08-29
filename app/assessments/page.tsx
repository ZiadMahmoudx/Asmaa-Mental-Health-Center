import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { getMyAssessmentsAction } from "@/app/actions/assessments.actions";
import { AssessmentRunner } from "@/components/clinical/AssessmentRunner";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "المقاييس النفسية الإكلينيكية | مركز أسما للصحة النفسية"
        : "Clinical Self-Assessments | Asmaa Mental Health Center",
    description:
      lang === "ar"
        ? "مقاييس فحص إكلينيكية معتمدة وموثوقة تشمل الاكتئاب، القلق، الصدمات، الوسواس، وتشتت الانتباه."
        : "Standardized clinical screening instruments for depression, anxiety, trauma, OCD, and attention symptoms.",
  };
}

export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const [auth, csrfToken, lang] = await Promise.all([
    getAuthContext(),
    ensureCsrfToken(),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  const historyResult = auth ? await getMyAssessmentsAction() : null;
  const history = historyResult?.ok ? historyResult.data : [];

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-teal-950">
            {isAr ? "المقاييس النفسية الإكلينيكية" : "Clinical Self-Assessments"}
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            {isAr
              ? "مقاييس فحص عالمية معتمدة تساعدك على فهم أعراضك بشكل موضوعي. النتيجة تُحفظ في ملفك ويطّلع عليها استشاريك المعالج فقط."
              : "Standardized clinical screening instruments to help you objectively understand your symptoms. Results are saved to your confidential chart and accessible only to your treating consultant."}
          </p>
          <p className="text-[11px] text-sage-800 flex items-center gap-1.5 pt-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-sage-700" />
            <span>
              {isAr
                ? "أداة فحص مبدئية استرشادية وليست تشخيصاً طبياً نهائياً."
                : "Informational screening tool — not a definitive medical diagnosis."}
            </span>
          </p>
        </header>

        <AssessmentRunner
          csrfToken={csrfToken}
          isAuthenticated={Boolean(auth)}
          history={history}
        />
      </div>
    </div>
  );
}
