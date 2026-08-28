import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { getMySafetyPlanAction, type SafetyPlanView } from "@/app/actions/safety-plan.actions";
import { SafetyPlanEditor } from "@/components/clinical/SafetyPlanEditor";

export const metadata: Metadata = {
  title: "خطة الأمان النفسي | مركز أسما للصحة النفسية",
  description:
    "خطة أمان شخصية بمنهجية Stanley-Brown: علامات الإنذار، استراتيجيات التهدئة، وجهات الاتصال في الأزمات.",
};

/** National mental health hotline (Egypt), staffed 24/7. */
const HOTLINE = "16328";

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

/**
 * Safety plan.
 *
 * Readable without an account on purpose — the page carries the hotline and the
 * crisis guidance, and putting a login wall in front of that would be the wrong
 * call for the one visitor who needs it most. Saving requires an account.
 */
export const dynamic = "force-dynamic";

export default async function SafetyPlanPage() {
  const [auth, csrfToken] = await Promise.all([getAuthContext(), ensureCsrfToken()]);

  const planResult = auth ? await getMySafetyPlanAction() : null;
  const plan = planResult?.ok ? planResult.data : EMPTY_PLAN;

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-teal-950">خطة الأمان النفسي</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            خطة شخصية تكتبها وأنت في حالة استقرار، لتكون جاهزة وقت الأزمة. مبنية على منهجية
            Stanley-Brown المعتمدة عالمياً في الوقاية من إيذاء النفس.
          </p>
          <p className="text-[11px] text-sage-800 flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            خطتك محفوظة بسرية ولا يطّلع عليها سوى استشاريك المعالج.
          </p>
        </header>

        <SafetyPlanEditor
          plan={plan}
          csrfToken={csrfToken}
          isAuthenticated={Boolean(auth)}
          hotline={HOTLINE}
        />
      </div>
    </div>
  );
}
