import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { getMyAssessmentsAction } from "@/app/actions/assessments.actions";
import { AssessmentRunner } from "@/components/clinical/AssessmentRunner";

export const metadata: Metadata = {
  title: "المقاييس النفسية | مركز أسما للصحة النفسية",
  description:
    "مقاييس فحص إكلينيكية معتمدة: الاكتئاب (PHQ-9)، القلق المعمم (GAD-7)، وشدة الأرق (ISI).",
};

/**
 * Screening scales.
 *
 * Browsable signed out — someone worried at 3 a.m. should not hit a login wall
 * before they can check a PHQ-9 — but saving a result requires an account,
 * because a stored score is clinical data that has to belong to someone.
 */
export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const [auth, csrfToken] = await Promise.all([getAuthContext(), ensureCsrfToken()]);

  const historyResult = auth ? await getMyAssessmentsAction() : null;
  const history = historyResult?.ok ? historyResult.data : [];

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-teal-950">
            المقاييس النفسية الإكلينيكية
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            مقاييس فحص عالمية معتمدة تساعدك على فهم أعراضك بشكل موضوعي. النتيجة تُحفظ في ملفك
            ويطّلع عليها استشاريك المعالج فقط.
          </p>
          <p className="text-[11px] text-sage-800 flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            أداة فحص مبدئية وليست تشخيصاً طبياً.
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
