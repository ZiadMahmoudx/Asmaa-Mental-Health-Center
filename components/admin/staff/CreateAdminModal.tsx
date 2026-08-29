"use client";

import React, { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { createAdminAction } from "@/app/actions/staff.actions";
import { CSRF_FIELD } from "@/lib/constants";

interface Props {
  csrfToken: string;
  onClose: () => void;
}

export function CreateAdminModal({ csrfToken, onClose }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createAdminAction, null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-6 text-start">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-800 border border-teal-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isAr ? "إضافة موظف إدارة / استقبال" : "Add Admin / Desk Officer"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? "منح صلاحيات الإدارة ومراجعة المدفوعات لموظف بالمركز."
                  : "Grant administration desk and payment verification access."}
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

        {/* Success Screen */}
        {state?.ok ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-emerald-900 text-base">
              {isAr ? "تم إنشاء حساب الإدارة بنجاح!" : "Admin Account Created Successfully!"}
            </h4>
            <p className="text-xs text-emerald-800">
              {isAr
                ? "يمكن للموظف الآن تسجيل الدخول مباشرة والوصول لمكتب مراجعة المدفوعات ولوحات الإدارة."
                : "The staff member can now log in to access the payment desk and admin tools."}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />

            {!state?.ok && state && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {isAr ? state.messageAr : state.messageEn ?? state.messageAr}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "الاسم الكامل" : "Full Name"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                placeholder={isAr ? "الاسم الثلاثي..." : "Full name..."}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "البريد الإلكتروني" : "Email Address"} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                dir="ltr"
                placeholder="admin@asmaaclinic.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "رقم الهاتف المحمول" : "Mobile Phone"} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                dir="ltr"
                placeholder="01012345678"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "كلمة المرور المبدئية" : "Initial Password"} <span className="text-red-500">*</span>
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

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
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
                className="inline-flex items-center gap-2 px-6 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isAr ? "إنشاء حساب الموظف" : "Create Staff Account"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
