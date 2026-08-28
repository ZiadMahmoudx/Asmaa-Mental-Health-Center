import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { getAuthContext } from "@/lib/auth/session";
import { dashboardPathForRole } from "@/lib/auth/guards";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = {
  title: "تسجيل الدخول | مركز أسما للصحة النفسية",
  description: "تسجيل الدخول لحجز الجلسات ومتابعة ملفك العلاجي بسرية تامة.",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Validated against the database, not against the cookie: a stale or revoked
  // cookie must land on the form, not bounce back to a dashboard that will
  // immediately reject it.
  const auth = await getAuthContext();
  if (auth) redirect(dashboardPathForRole(auth.user.role));

  const csrfToken = await ensureCsrfToken();

  return (
    <div className="min-h-screen py-12 bg-alabaster-base">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-7 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7 text-teal-800" />
            </div>
            <h1 className="text-xl font-black text-teal-950">تسجيل الدخول</h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              مرحباً بعودتك. سجّل الدخول لمتابعة مواعيدك وملفك العلاجي.
            </p>
          </div>

          <LoginForm csrfToken={csrfToken} next={next} />
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-5 leading-relaxed">
          جميع البيانات الصحية مشفّرة ولا يطّلع عليها سوى فريقك العلاجي.
        </p>
      </div>
    </div>
  );
}
