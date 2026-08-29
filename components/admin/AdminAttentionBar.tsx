"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, Clock, ShieldAlert } from "lucide-react";
import type { AdminBadgeCounts } from "@/app/actions/admin-badges.actions";

interface Props {
  badges: AdminBadgeCounts;
  isAr: boolean;
}

export function AdminAttentionBar({ badges, isAr }: Props) {
  const hasUrgentAlerts = badges.unacknowledgedSafetyAlerts > 0 || badges.criticalCrisisAlerts > 0;
  const hasStaleProofs = badges.urgentProofsOver24h > 0;

  if (!hasUrgentAlerts && !hasStaleProofs) return null;

  return (
    <aside
      role="alert"
      aria-label={isAr ? "تنبيهات الإدارة العاجلة" : "Admin Actionable Alerts"}
      className="bg-gradient-to-r from-red-950 via-red-900 to-amber-950 text-white rounded-3xl p-4 sm:p-5 border-2 border-red-500/60 shadow-xl space-y-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-800/80 border border-red-600 flex items-center justify-center text-red-200 shrink-0 animate-pulse">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h2 className="text-xs sm:text-sm font-black text-red-100">
            {isAr ? "تنبيهات تشغيلية وإكلينيكية تستوجب التدخل الفوري" : "Urgent Operational & Clinical Items"}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {badges.unacknowledgedSafetyAlerts > 0 && (
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition shadow-sm animate-pulse"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>
                {isAr
                  ? `${badges.unacknowledgedSafetyAlerts} بلاغ طوارئ غير مستجاب له`
                  : `${badges.unacknowledgedSafetyAlerts} Unacknowledged safety alert`}
              </span>
            </Link>
          )}

          {badges.urgentProofsOver24h > 0 && (
            <Link
              href="/dashboard/admin/verification"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition shadow-sm"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {isAr
                  ? `${badges.urgentProofsOver24h} إيصال تجاوز 24 ساعة (يقترب من SLA)`
                  : `${badges.urgentProofsOver24h} receipts > 24h old`}
              </span>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
