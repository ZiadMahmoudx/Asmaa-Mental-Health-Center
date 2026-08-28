"use client";

import React, { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { loginAction, registerAction, type AuthenticatedUserPayload } from "@/app/actions/auth.actions";
import type { ActionResult } from "@/lib/result";
import { CSRF_FIELD } from "@/lib/constants";

/**
 * Login and registration forms.
 *
 * Both bind a Server Action through `useActionState`, so submission works
 * without client JS and the pending flag comes from React rather than local
 * state. The redirect happens on the client after a successful result: the
 * action returns the role-appropriate landing path instead of redirecting
 * itself, which keeps the failure path (wrong password, taken email) able to
 * return field-level errors to this form.
 */

const initialState: ActionResult<AuthenticatedUserPayload> | null = null;

function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="p-3.5 rounded-2xl bg-crisis-light border border-crisis/30 text-crisis-dark text-xs font-bold flex items-start gap-2"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="text-[11px] text-crisis font-bold block mt-1">{message}</span>;
}

function useAuthRedirect(state: ActionResult<AuthenticatedUserPayload> | null) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      // `refresh` first so the server components re-render with the new session
      // cookie already applied, then navigate to the role's dashboard.
      router.refresh();
      router.replace(state.data.redirectTo);
    }
  }, [state, router]);
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export function LoginForm({ csrfToken, next }: { csrfToken: string; next?: string }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  useAuthRedirect(state);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
      {next && <input type="hidden" name="next" value={next} />}

      {state && !state.ok && <FormError message={isAr ? state.messageAr : state.messageEn} />}

      <label className="block">
        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
          <Mail className="w-3.5 h-3.5 text-sage-700" />
          {isAr ? "البريد الإلكتروني" : "Email address"}
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          dir="ltr"
          className="w-full bg-alabaster-muted px-4 py-3 rounded-2xl text-sm border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
        />
        <FieldError message={fieldErrors?.email} />
      </label>

      <label className="block">
        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
          <Lock className="w-3.5 h-3.5 text-sage-700" />
          {isAr ? "كلمة المرور" : "Password"}
        </span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="w-full bg-alabaster-muted px-4 py-3 rounded-2xl text-sm border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
        />
        <FieldError message={fieldErrors?.password} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3.5 rounded-2xl bg-teal-800 hover:bg-teal-900 disabled:opacity-60 text-white font-extrabold text-sm transition flex items-center justify-center gap-2"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        {isAr ? "تسجيل الدخول" : "Sign in"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        {isAr ? "ليس لديك حساب؟" : "No account yet?"}{" "}
        <Link href="/register" className="font-bold text-teal-800 hover:text-teal-950">
          {isAr ? "إنشاء حساب جديد" : "Create one"}
        </Link>
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export function RegisterForm({ csrfToken }: { csrfToken: string }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  useAuthRedirect(state);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name={CSRF_FIELD} value={csrfToken} />

      {state && !state.ok && <FormError message={isAr ? state.messageAr : state.messageEn} />}

      <label className="block">
        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
          <User className="w-3.5 h-3.5 text-sage-700" />
          {isAr ? "الاسم الكامل" : "Full name"}
        </span>
        <input
          type="text"
          name="fullName"
          required
          minLength={3}
          maxLength={120}
          autoComplete="name"
          className="w-full bg-alabaster-muted px-4 py-3 rounded-2xl text-sm border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
        />
        <FieldError message={fieldErrors?.fullName} />
      </label>

      <label className="block">
        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
          <Mail className="w-3.5 h-3.5 text-sage-700" />
          {isAr ? "البريد الإلكتروني" : "Email address"}
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          dir="ltr"
          className="w-full bg-alabaster-muted px-4 py-3 rounded-2xl text-sm border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
        />
        <FieldError message={fieldErrors?.email} />
      </label>

      <label className="block">
        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
          <Phone className="w-3.5 h-3.5 text-sage-700" />
          {isAr ? "رقم الهاتف المحمول (واتساب)" : "Mobile number (WhatsApp)"}
        </span>
        <input
          type="tel"
          name="phone"
          required
          placeholder="01001234567"
          autoComplete="tel"
          dir="ltr"
          className="w-full bg-alabaster-muted px-4 py-3 rounded-2xl text-sm border border-alabaster-border focus:outline-none focus:border-teal-700 font-mono"
        />
        <FieldError message={fieldErrors?.phone} />
        <span className="text-[10px] text-gray-400 block mt-1">
          {isAr
            ? "نستخدمه لإرسال تعليمات الدفع وتأكيد الحجز عبر واتساب."
            : "Used to send payment instructions and booking confirmations on WhatsApp."}
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold text-gray-700 mb-1.5 block">
            {isAr ? "كلمة المرور" : "Password"}
          </span>
          <input
            type="password"
            name="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="w-full bg-alabaster-muted px-4 py-3 rounded-2xl text-sm border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
          />
          <FieldError message={fieldErrors?.password} />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-gray-700 mb-1.5 block">
            {isAr ? "تأكيد كلمة المرور" : "Confirm password"}
          </span>
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={10}
            autoComplete="new-password"
            className="w-full bg-alabaster-muted px-4 py-3 rounded-2xl text-sm border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
          />
          <FieldError message={fieldErrors?.confirmPassword} />
        </label>
      </div>

      <label className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-alabaster-base border border-alabaster-border cursor-pointer">
        <input
          type="checkbox"
          name="acceptTerms"
          required
          className="mt-0.5 w-4 h-4 accent-teal-800"
        />
        <span className="text-[11px] text-gray-600 leading-relaxed">
          {isAr
            ? "أوافق على سياسة الخصوصية وسرية البيانات الطبية، وأقر بأن بياناتي الصحية تُعامل بسرية تامة ولا تُشارك مع أي جهة خارجية."
            : "I agree to the privacy policy and confirm my health data is kept strictly confidential."}
        </span>
      </label>
      <FieldError message={fieldErrors?.acceptTerms} />

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3.5 rounded-2xl bg-teal-800 hover:bg-teal-900 disabled:opacity-60 text-white font-extrabold text-sm transition flex items-center justify-center gap-2"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {isAr ? "إنشاء الحساب" : "Create account"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        {isAr ? "لديك حساب بالفعل؟" : "Already registered?"}{" "}
        <Link href="/login" className="font-bold text-teal-800 hover:text-teal-950">
          {isAr ? "تسجيل الدخول" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
