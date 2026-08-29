import type { ReactNode } from "react";
import { requireRolePage } from "@/lib/auth/guards";
import { getLanguage } from "@/lib/i18n/server";
import { getAdminBadgeCountsAction } from "@/app/actions/admin-badges.actions";
import { AdminSubNav } from "@/components/admin/AdminSubNav";
import { AdminAttentionBar } from "@/components/admin/AdminAttentionBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [_, lang, badgesResult] = await Promise.all([
    requireRolePage(["ADMIN"], "/dashboard/admin"),
    getLanguage(),
    getAdminBadgeCountsAction(),
  ]);
  const isAr = lang === "ar";
  const badges = badgesResult.ok
    ? badgesResult.data
    : {
        unacknowledgedSafetyAlerts: 0,
        criticalCrisisAlerts: 0,
        pendingPaymentProofs: 0,
        urgentProofsOver24h: 0,
        unsettledCredits: 0,
        upcomingReminders: 0,
      };

  return (
    <div className="min-h-screen py-8 bg-alabaster-base">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <AdminAttentionBar badges={badges} isAr={isAr} />
        <AdminSubNav badges={badges} isAr={isAr} />
        <main>{children}</main>
      </div>
    </div>
  );
}
