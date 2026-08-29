"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  Power,
  ShieldAlert,
  Unlock,
  X,
} from "lucide-react";
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
        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 border ${
          isActive
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
            : "bg-red-50 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isActive ? "bg-emerald-600" : "bg-red-600"
          }`}
        />
        {isActive ? "نشط" : "مجمد"}
      </button>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3
                className={`font-bold text-sm flex items-center gap-2 ${
                  isActive ? "text-red-600" : "text-emerald-600"
                }`}
              >
                <Power className="w-4 h-4" />
                {isActive ? "تجميد وتعطيل الحساب" : "إعادة تفعيل الحساب"}
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!state?.ok && state?.messageAr && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {state.messageAr}
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isActive ? (
                <>
                  أنت على وشك <strong>تجميد حساب {userName} ({userRole})</strong>. سيتم إنهاء
                  جلسات تسجيل دخوله فورياً ولن يتمكن من الوصول للمنصة أو قراءة أي ملفات للمرضى، مع
                  الحفاظ على تقاريره السابقة وسجلاته الطبية.
                </>
              ) : (
                <>
                  أنت على وشك <strong>إعادة تفعيل حساب {userName} ({userRole})</strong> ليتمكن
                  من تسجيل الدخول واستئناف عمله في المركز.
                </>
              )}
            </p>

            <form action={formAction} className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="isActive" value={String(!isActive)} />

              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
              >
                تراجع
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
                {isActive ? "تأكيد التجميد" : "تأكيد التفعيل"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
