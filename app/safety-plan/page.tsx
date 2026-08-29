import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { getMySafetyPlanAction, type SafetyPlanView } from "@/app/actions/safety-plan.actions";
import { SafetyPlanEditor } from "@/components/clinical/SafetyPlanEditor";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "خطة الأمان النفسي | مركز أسما للصحة النفسية"
        : "Crisis Safety Plan | Asmaa Mental Health Center",
    description:
      lang === "ar"
        ? "خطة أمان شخصية بمنهجية Stanley-Brown: علامات الإنذار، استراتيجيات التهدئة، وجهات الاتصال في الأزمات."
        : "Personal crisis safety plan based on the evidence-based Stanley-Brown model.",
  };
}

const EMPTY_PLAN: SafetyPlanView = {
  warningSigns: [],
  copingStrategies: [],
  socialDistractions: [],
  trustedContacts: [],
  professionalContacts: [],
  environmentSteps: [],
  reasonsForLiving: null,
  updatedAtUTC: null,
};

export const dynamic = "force-dynamic";

export default async function SafetyPlanPage() {
  const [auth, csrfToken, lang] = await Promise.all([
    getAuthContext(),
    ensureCsrfToken(),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  const planResult = auth ? await getMySafetyPlanAction() : null;
  const plan = planResult?.ok ? planResult.data : EMPTY_PLAN;

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-teal-950">
            {isAr ? "خطة الأمان النفسي" : "Crisis Safety Plan"}
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            {isAr
              ? "خطة شخصية تكتبها وأنت في حالة استقرار، لتكون جاهزة وقت الأزمة. مبنية على منهجية Stanley-Brown المعتمدة عالمياً في الوقاية من إيذاء النفس."
              : "A personalized crisis plan created during calm moments so you are prepared in distress. Built on the evidence-based Stanley-Brown Safety Planning Intervention."}
          </p>
          <p className="text-[11px] text-sage-800 flex items-center gap-1.5 pt-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-sage-700" />
            <span>
              {isAr
                ? "خطتك محفوظة بسرية ولا يطّلع عليها سوى استشاريك المعالج."
                : "Your plan is strictly confidential and accessible only to you and your treating consultant."}
            </span>
          </p>
        </header>

        <SafetyPlanEditor
          plan={plan}
          csrfToken={csrfToken}
          isAuthenticated={Boolean(auth)}
          hotline="16328"
        />
      </div>
    </div>
  );
}
