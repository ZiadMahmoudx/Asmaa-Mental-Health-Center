"use client";

import React, { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { adminResetPasswordAction } from "@/app/actions/staff.actions";
import { CSRF_FIELD } from "@/lib/constants";

interface Props {
  userId: string;
  userName: string;
  userRole: string;
  csrfToken: string;
  onClose: () => void;
}

export function ResetPasswordModal({
  userId,
  userName,
  userRole,
  csrfToken,
  onClose,
}: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(adminResetPasswordAction, null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-5 text-start">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isAr ? "إعادة تعيين كلمة المرور" : "Reset Account Password"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr ? "المستخدم: " : "User: "}
                <strong className="text-slate-800">{userName}</strong> ({userRole})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            aria-label={isAr ? "إغلاق" : "Close"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {state?.ok ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-emerald-900 text-sm">
              {isAr ? "تم تعيين كلمة المرور الجديدة بنجاح!" : "New Password Set Successfully!"}
            </h4>
            <p className="text-xs text-emerald-800">
              {isAr
                ? "تم إنهاء جميع الجلسات المفتوحة لهذا الحساب فورياً، ويجب على المستخدم تسجيل الدخول بكلمة المرور الجديدة."
                : "All active sessions have been terminated. The user must log in with the new password."}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <input type="hidden" name="userId" value={userId} />

            {!state?.ok && state && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {isAr ? state.messageAr : state.messageEn ?? state.messageAr}
              </div>
            )}

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {isAr
                  ? "إعادة تعيين كلمة المرور ستؤدي لتسجيل الخروج التلقائي من جميع الأجهزة النشطة لهذا المستخدم."
                  : "Resetting password revokes all active session tokens immediately."}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "كلمة المرور الجديدة" : "New Password"} <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                required
                dir="ltr"
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {isAr ? "٨ أحرف على الأقل تشمل حرفاً كبيراً ورقماً." : "Min 8 chars, uppercase & digit required."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"} <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                dir="ltr"
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isAr ? "تأكيد وحفظ كلمة المرور" : "Save New Password"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
