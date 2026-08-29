"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  CalendarCheck,
  CalendarClock,
  Coins,
  LayoutDashboard,
  Receipt,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { AdminBadgeCounts } from "@/app/actions/admin-badges.actions";

interface Props {
  badges: AdminBadgeCounts;
  isAr: boolean;
}

export function AdminSubNav({ badges, isAr }: Props) {
  const pathname = usePathname();

  const links = [
    {
      href: "/dashboard/admin",
      label: isAr ? "نظرة عامة" : "Overview",
      icon: LayoutDashboard,
      exact: true,
      badge: badges.unacknowledgedSafetyAlerts > 0 ? badges.unacknowledgedSafetyAlerts : undefined,
      badgeColor: "bg-red-500 text-white animate-pulse",
    },
    {
      href: "/dashboard/admin/verification",
      label: isAr ? "مكتب التحقق" : "Verification",
      icon: Receipt,
      exact: false,
      badge: badges.pendingPaymentProofs > 0 ? badges.pendingPaymentProofs : undefined,
      badgeColor: badges.urgentProofsOver24h > 0 ? "bg-red-500 text-white animate-pulse" : "bg-teal-900 text-teal-100",
    },
    {
      href: "/dashboard/admin/appointments",
      label: isAr ? "المواعيد" : "Appointments",
      icon: CalendarCheck,
      exact: false,
    },
    {
      href: "/dashboard/admin/credits",
      label: isAr ? "الأرصدة والتعويضات" : "Credits",
      icon: Coins,
      exact: false,
      badge: badges.unsettledCredits > 0 ? badges.unsettledCredits : undefined,
      badgeColor: "bg-amber-500 text-slate-950",
    },
    {
      href: "/dashboard/admin/staff",
      label: isAr ? "طاقم العمل" : "Staff",
      icon: Users,
      exact: false,
    },
    {
      href: "/dashboard/admin/schedule",
      label: isAr ? "مواعيد العمل" : "Schedules",
      icon: CalendarClock,
      exact: false,
    },
    {
      href: "/dashboard/admin/reminders",
      label: isAr ? "التذكيرات" : "Reminders",
      icon: BellRing,
      exact: false,
      badge: badges.upcomingReminders > 0 ? badges.upcomingReminders : undefined,
      badgeColor: "bg-sage-600 text-white",
    },
  ];

  return (
    <nav
      aria-label={isAr ? "أقسام لوحة الإدارة" : "Admin Sub-workspaces Navigation"}
      className="p-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto"
    >
      <div className="flex items-center gap-1.5 min-w-max">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 select-none ${
                isActive
                  ? "bg-teal-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-sage-300" : "text-slate-400"}`} />
              <span>{link.label}</span>
              {typeof link.badge === "number" && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    link.badgeColor
                  }`}
                >
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
