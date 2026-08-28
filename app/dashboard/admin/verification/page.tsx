import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Banknote, Smartphone } from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getPendingPaymentsAction } from "@/app/actions/payment.actions";
import { getReviewHistoryAction } from "@/app/actions/admin.actions";
import { getClinicConfig } from "@/lib/clinic-config";
import { PaymentVerificationDesk } from "@/components/admin/PaymentVerificationDesk";

export const metadata: Metadata = {
  title: "مكتب مراجعة المدفوعات | مركز أسما للصحة النفسية",
  description: "مراجعة واعتماد إيصالات إنستا باي وفودافون كاش وتأكيد الحجوزات.",
};

/**
 * The desk is inherently per-request: it must never be served from a cache, or a
 * reviewer could act on a receipt another admin already handled.
 */
export const dynamic = "force-dynamic";

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ proof?: string }>;
}) {
  // Redirects to /login (or /403) before any data is read.
  await requireRolePage(["ADMIN"], "/dashboard/admin/verification");

  const { proof } = await searchParams;
  const [csrfToken, pending, history] = await Promise.all([
    readCsrfToken(),
    getPendingPaymentsAction(),
    getReviewHistoryAction(30),
  ]);

  const clinic = getClinicConfig();

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>العودة للوحة الإدارة</span>
        </Link>

        {/* The clinic's own payment destinations, so the reviewer can match a
            receipt against the account it should have been sent to. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-alabaster-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold block">
                حساب إنستا باي المعتمد للمركز
              </span>
              <span className="text-sm font-black text-teal-950 font-mono" dir="ltr">
                {clinic.instapayHandle}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-alabaster-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-sage-700" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold block">
                محافظ فودافون كاش المعتمدة
              </span>
              <span className="text-sm font-black text-sage-900 font-mono" dir="ltr">
                {clinic.vodafoneCashNumbers.join(" • ")}
              </span>
            </div>
          </div>
        </div>

        {pending.ok && history.ok ? (
          <PaymentVerificationDesk
            rows={pending.data}
            history={history.data}
            csrfToken={csrfToken}
            initialProofId={proof}
          />
        ) : (
          <div className="bg-white rounded-3xl border border-crisis/20 p-8 text-center space-y-2">
            <h2 className="text-sm font-black text-crisis-dark">
              تعذّر تحميل قائمة المراجعة
            </h2>
            <p className="text-xs text-gray-600">
              {(!pending.ok && pending.messageAr) || (!history.ok && history.messageAr)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
