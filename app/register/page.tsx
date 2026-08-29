import type { Metadata } from "next";
import { HeartHandshake } from "lucide-react";
import { redirect } from "next/navigation";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { getAuthContext } from "@/lib/auth/session";
import { dashboardPathForRole } from "@/lib/auth/guards";
import { RegisterForm } from "@/components/auth/AuthForms";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "إنشاء حساب جديد | مركز أسما للصحة النفسية"
        : "Create Account | Asmaa Mental Health Center",
    description:
      lang === "ar"
        ? "أنشئ حسابك لحجز جلسة أونلاين أو زيارة حضورية بالعيادة."
        : "Create your confidential account to book telepsychiatry and in-clinic consultations.",
  };
}

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const [auth, csrfToken, lang] = await Promise.all([
    getAuthContext(),
    ensureCsrfToken(),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  if (auth) redirect(dashboardPathForRole(auth.user.role));

  return (
    <div className="min-h-screen py-12 bg-alabaster-base">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-7 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sage-50 flex items-center justify-center mx-auto">
              <HeartHandshake className="w-7 h-7 text-sage-700" />
            </div>
            <h1 className="text-xl font-black text-teal-950">
              {isAr ? "إنشاء حساب جديد" : "Create Account"}
            </h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              {isAr
                ? "خطوة واحدة تفصلك عن حجز جلستك مع نخبة استشاريي الصحة النفسية."
                : "One simple step to begin your confidential mental health care journey."}
            </p>
          </div>

          <RegisterForm csrfToken={csrfToken} />
        </div>
      </div>
    </div>
  );
}
