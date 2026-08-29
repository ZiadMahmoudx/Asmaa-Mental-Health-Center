import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { IntakeWizard } from "@/components/clinical/IntakeWizard";

export const metadata: Metadata = {
  title: "الاستبيان الطبي الذكي | مركز أسما للصحة النفسية",
  description:
    "استبيان فرز إكلينيكي قصير يوجّهك للاستشاري الأنسب لحالتك داخل مركز أسما للصحة النفسية.",
};

/**
 * Clinical intake / triage.
 *
 * The questionnaire itself is open to everyone — a visitor should be able to
 * work through it before committing to an account — but submitting requires a
 * session, because the result is a clinical record about a named person and the
 * clinic acts on its crisis flag.
 */
import { isConcernTag } from "@/lib/content/intake";

export const dynamic = "force-dynamic";

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ concern?: string }>;
}) {
  const [auth, csrfToken, params] = await Promise.all([
    getAuthContext(),
    ensureCsrfToken(),
    searchParams,
  ]);

  const initialConcern =
    typeof params?.concern === "string" && isConcernTag(params.concern)
      ? params.concern
      : null;

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-teal-950">
            الاستبيان الطبي الذكي
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            أربع خطوات قصيرة (٣ دقائق) نفهم من خلالها ما تمر به، لنوجّهك للاستشاري الأنسب لحالتك
            بدل أن تختار من قائمة طويلة.
          </p>
          <p className="text-[11px] text-sage-800 flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            إجاباتك سرية تماماً ولا يطّلع عليها سوى الفريق الطبي بالمركز.
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
