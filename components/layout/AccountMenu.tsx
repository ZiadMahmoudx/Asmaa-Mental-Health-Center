"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Shield,
  Stethoscope,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { logoutAction } from "@/app/actions/auth.actions";
import { CSRF_FIELD } from "@/lib/constants";
import type { Role } from "@/lib/domain/enums";

/**
 * Account menu — the replacement for the old client-side role switcher.
 *
 * The switcher it replaces called `switchUserRole("ADMIN")` in the browser and
 * wrote the result to localStorage, which meant any visitor could reach the
 * admin and clinical screens in two clicks. Identity here is not something the
 * client can choose: `user` is resolved from the server session in the root
 * layout and passed down, and signing out is a POST through a Server Action that
 * revokes the session row in the database.
 *
 * Rendering the menu for a role is only a convenience. Every route re-checks the
 * role in `requireRolePage`, and every action re-checks it in `requireRole`, so
 * a tampered prop changes what is drawn and nothing else.
 */

export interface AccountMenuUser {
  fullName: string;
  email: string;
  role: Role;
}

const ROLE_META: Record<
  Role,
  { ar: string; en: string; dot: string; icon: typeof UserIcon; dashboard: string }
> = {
  PATIENT: {
    ar: "بوابة المريض",
    en: "Patient portal",
    dot: "bg-emerald-500",
    icon: UserIcon,
    dashboard: "/dashboard/patient",
  },
  DOCTOR: {
    ar: "لوحة الاستشاري",
    en: "Consultant portal",
    dot: "bg-amber-500",
    icon: Stethoscope,
    dashboard: "/dashboard/doctor",
  },
  ADMIN: {
    ar: "لوحة الإدارة",
    en: "Admin portal",
    dot: "bg-purple-500",
    icon: Shield,
    dashboard: "/dashboard/admin/verification",
  },
};

export function AccountMenu({
  user,
  csrfToken,
}: {
  user: AccountMenuUser | null;
  csrfToken: string;
}) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Bound with useActionState rather than passed straight to `action`, so a
  // failed CSRF check comes back as a message instead of being swallowed.
  const [signOutState, signOutAction, signingOut] = useActionState(logoutAction, null);

  // Close on outside click and on Escape, so the menu never traps focus or
  // lingers over the page after navigation.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-900 bg-sage-50 border border-sage-200/60 hover:bg-sage-100 transition"
        >
          <LogIn className="w-3.5 h-3.5 text-teal-800" />
          <span>{isAr ? "تسجيل الدخول" : "Sign in"}</span>
        </Link>
        <Link
          href="/register"
          className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{isAr ? "حساب جديد" : "Register"}</span>
        </Link>
      </div>
    );
  }

  const meta = ROLE_META[user.role];
  const RoleIcon = meta.icon;
  const firstName = user.fullName.split(/\s+/).slice(0, 2).join(" ");

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-alabaster-muted border border-alabaster-border text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
      >
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <span className="max-w-[120px] truncate">{firstName}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full mt-2 end-0 w-60 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 text-xs"
        >
          <div className="px-3.5 py-2 border-b border-gray-100">
            <p className="font-extrabold text-gray-900 truncate">{user.fullName}</p>
            <p className="text-[11px] text-gray-500 truncate" dir="ltr">
              {user.email}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-alabaster-muted text-[10px] font-bold text-gray-700">
              <RoleIcon className="w-3 h-3 text-sage-700" />
              {isAr ? meta.ar : meta.en}
            </span>
          </div>

          <Link
            href={meta.dashboard}
            onClick={() => setOpen(false)}
            role="menuitem"
            className="w-full px-3.5 py-2.5 hover:bg-teal-50 flex items-center gap-2 font-medium text-gray-700"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-teal-800" />
            <span>{isAr ? "الذهاب إلى لوحتي" : "Go to my dashboard"}</span>
          </Link>

          {user.role === "ADMIN" && (
            <Link
              href="/dashboard/admin/verification"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="w-full px-3.5 py-2.5 hover:bg-teal-50 flex items-center gap-2 font-medium text-gray-700"
            >
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>{isAr ? "مكتب مراجعة المدفوعات" : "Verification desk"}</span>
            </Link>
          )}

          {/* A real form POST, not a client-side state reset: the action revokes
              the session row and clears the cookies server-side. */}
          <form action={signOutAction} className="border-t border-gray-100 mt-1 pt-1">
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
            <button
              type="submit"
              role="menuitem"
              disabled={signingOut}
              className="w-full text-start px-3.5 py-2.5 hover:bg-crisis-light disabled:opacity-60 flex items-center gap-2 font-medium text-crisis-dark"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>
                {signingOut
                  ? isAr ? "جارٍ تسجيل الخروج…" : "Signing out…"
                  : isAr ? "تسجيل الخروج" : "Sign out"}
              </span>
            </button>
            {signOutState && (
              <p className="px-3.5 pb-2 pt-1 text-[11px] font-bold text-crisis">
                {isAr ? signOutState.messageAr : signOutState.messageEn}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
