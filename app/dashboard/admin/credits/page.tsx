import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getOutstandingCreditsAction } from "@/app/actions/credits.actions";
import { CreditsManagementDashboard } from "@/components/admin/credits/CreditsManagementDashboard";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "سجل الأمان المالي وأرصدة المرضى | لوحة الإدارة"
        : "Patient Credit & Financial Ledger | Admin Portal",
    description:
      lang === "ar"
        ? "متابعة ديون ومستحقات المرضى، تسوية المبالغ عبر InstaPay، وتدقيق العمليات المالية."
        : "Audit patient credit balances, manage InstaPay settlement payouts, and adjust ledger entries.",
  };
}

export const dynamic = "force-dynamic";

export default async function AdminCreditsPage() {
  const [_, lang] = await Promise.all([
    requireRolePage(["ADMIN"], "/dashboard/admin/credits"),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  const [creditsResult, csrfToken] = await Promise.all([
    getOutstandingCreditsAction(),
    readCsrfToken(),
  ]);

  if (!creditsResult.ok) {
    return (
      <div className="min-h-screen py-16 bg-slate-50">
        <div className="max-w-lg mx-auto px-4 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
          <h1 className="text-lg font-black text-red-700">
            {isAr ? "تعذّر تحميل سجل أرصدة المرضى" : "Unable to load credit ledger"}
          </h1>
          <p className="text-xs text-slate-600">
            {isAr ? creditsResult.messageAr : creditsResult.messageEn ?? creditsResult.messageAr}
          </p>
        </div>
      </div>
    );
  }

  const outstandingCredits = creditsResult.data;

  return (
    <div className="space-y-6">
      <CreditsManagementDashboard
        outstandingCredits={outstandingCredits}
        csrfToken={csrfToken}
      />
    </div>
  );
}
