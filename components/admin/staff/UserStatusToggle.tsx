"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Power,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { toggleUserActiveStatusAction } from "@/app/actions/staff.actions";
import { CSRF_FIELD } from "@/lib/constants";

interface Props {
  userId: string;
  userName: string;
  userRole: string;
  isActive: boolean;
  csrfToken: string;
}

export function UserStatusToggle({
  userId,
  userName,
  userRole,
  isActive,
  csrfToken,
}: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [state, formAction, isPending] = useActionState(toggleUserActiveStatusAction, null);

  useEffect(() => {
    if (state?.ok) {
      setShowConfirmModal(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirmModal(true)}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1.5 border ${
          isActive
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            : "bg-red-50 text-red-800 border-red-200 hover:bg-red-100"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isActive ? "bg-emerald-600" : "bg-red-600"
          }`}
        />
        <span>{isActive ? (isAr ? "نشط" : "Active") : isAr ? "مجمد" : "Frozen"}</span>
      </button>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3
                className={`font-bold text-sm flex items-center gap-2 ${
                  isActive ? "text-red-600" : "text-emerald-600"
                }`}
              >
                <Power className="w-4 h-4" />
                <span>
                  {isActive
                    ? isAr ? "تجميد وتعطيل الحساب" : "Freeze & Deactivate Account"
                    : isAr ? "إعادة تفعيل الحساب" : "Reactivate Account"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={isAr ? "إغلاق" : "Close"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!state?.ok && state && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {isAr ? state.messageAr : state.messageEn ?? state.messageAr}
              </div>
            )}

            <p className="text-xs text-slate-700 leading-relaxed">
              {isActive ? (
                isAr ? (
                  <>
                    أنت على وشك <strong>تجميد حساب {userName} ({userRole})</strong>. سيتم إنهاء
                    جلسات تسجيل دخوله فورياً ولن يتمكن من الوصول للمنصة أو قراءة أي ملفات للمرضى، مع
                    الحفاظ على تقاريره السابقة وسجلاته الطبية.
                  </>
                ) : (
                  <>
                    You are about to <strong>freeze {userName}&apos;s account ({userRole})</strong>. Active
                    sessions will be revoked immediately and access suspended. Historical records are preserved.
                  </>
                )
              ) : isAr ? (
                <>
                  أنت على وشك <strong>إعادة تفعيل حساب {userName} ({userRole})</strong> ليتمكن
                  من تسجيل الدخول واستئناف عمله في المركز.
                </>
              ) : (
                <>
                  You are about to <strong>reactivate {userName}&apos;s account ({userRole})</strong> to restore
                  system access.
                </>
              )}
            </p>

            <form action={formAction} className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="isActive" value={String(!isActive)} />

              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
              >
                {isAr ? "تراجع" : "Cancel"}
              </button>

              <button
                type="submit"
                disabled={isPending}
                className={`inline-flex items-center gap-2 px-5 py-2 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm ${
                  isActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isActive
                    ? isAr ? "تأكيد التجميد" : "Confirm Deactivation"
                    : isAr ? "تأكيد التفعيل" : "Confirm Activation"}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
