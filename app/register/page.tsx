import type { Metadata } from "next";
import { HeartHandshake } from "lucide-react";
import { redirect } from "next/navigation";
import { ensureCsrfToken } from "@/lib/auth/csrf";
import { getAuthContext } from "@/lib/auth/session";
import { dashboardPathForRole } from "@/lib/auth/guards";
import { RegisterForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = {
  title: "إنشاء حساب | مركز أسما للصحة النفسية",
  description: "أنشئ حسابك لحجز جلسة أونلاين أو زيارة حضورية بالعيادة.",
};

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  // Validated against the database, not against the cookie: a stale or revoked
  // cookie must land on the form, not bounce back to a dashboard that will
  // immediately reject it.
  const auth = await getAuthContext();
  if (auth) redirect(dashboardPathForRole(auth.user.role));

  const csrfToken = await ensureCsrfToken();

  return (
    <div className="min-h-screen py-12 bg-alabaster-base">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-7 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sage-50 flex items-center justify-center mx-auto">
              <HeartHandshake className="w-7 h-7 text-sage-700" />
            </div>
            <h1 className="text-xl font-black text-teal-950">إنشاء حساب جديد</h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              خطوة واحدة تفصلك عن حجز جلستك مع نخبة استشاريي الصحة النفسية.
            </p>
          </div>

          <RegisterForm csrfToken={csrfToken} />
        </div>
      </div>
    </div>
  );
}
