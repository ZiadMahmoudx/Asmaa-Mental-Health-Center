import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { getAuthContext } from "@/lib/auth/session";
import { dashboardPathForRole } from "@/lib/auth/guards";
import { LoginForm } from "@/components/auth/AuthForms";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "تسجيل الدخول | مركز أسما للصحة النفسية"
        : "Sign In | Asmaa Mental Health Center",
    description:
      lang === "ar"
        ? "تسجيل الدخول لحجز الجلسات ومتابعة ملفك العلاجي بسرية تامة."
        : "Sign in to book consultations and manage your clinical chart securely.",
  };
}

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [auth, csrfToken, lang, params] = await Promise.all([
    getAuthContext(),
    ensureCsrfToken(),
    getLanguage(),
    searchParams,
  ]);
  const isAr = lang === "ar";
  const { next } = params;

  if (auth) redirect(dashboardPathForRole(auth.user.role));

  return (
    <div className="min-h-screen py-12 bg-alabaster-base">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-7 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7 text-teal-800" />
            </div>
            <h1 className="text-xl font-black text-teal-950">
              {isAr ? "تسجيل الدخول" : "Sign In"}
            </h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              {isAr
                ? "مرحباً بعودتك. سجّل الدخول لمتابعة مواعيدك وملفك العلاجي."
                : "Welcome back. Sign in to access your appointments and confidential clinical chart."}
            </p>
          </div>

          <LoginForm csrfToken={csrfToken} next={next} />
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-5 leading-relaxed">
          {isAr
            ? "جميع البيانات الصحية مشفّرة ولا يطّلع عليها سوى فريقك العلاجي."
            : "All health records are strictly confidential and accessible only to your clinical team."}
        </p>
      </div>
    </div>
  );
}
