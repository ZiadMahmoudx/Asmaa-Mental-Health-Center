import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BellRing, ShieldAlert } from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getPendingRemindersAction } from "@/app/actions/reminders.actions";
import { ReminderQueueDashboard } from "@/components/admin/reminders/ReminderQueueDashboard";

export const metadata: Metadata = {
  title: "طابور تذكيرات الجلسات | لوحة الإدارة",
  description: "متابعة وإرسال تذكيرات المواعيد القادمة للمرضى عبر واتساب.",
};

export const dynamic = "force-dynamic";

export default async function AdminRemindersPage() {
  await requireRolePage(["ADMIN"], "/dashboard/admin/reminders");

  const [remindersResult, csrfToken] = await Promise.all([
    getPendingRemindersAction(),
    readCsrfToken(),
  ]);

  if (!remindersResult.ok) {
    return (
      <div className="min-h-screen py-16 bg-slate-50">
        <div className="max-w-lg mx-auto px-4 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
          <h1 className="text-lg font-black text-red-700">تعذّر تحميل طابور التذكيرات</h1>
          <p className="text-xs text-slate-600">{remindersResult.messageAr}</p>
        </div>
      </div>
    );
  }

  const reminders = remindersResult.data;

  return (
    <div className="min-h-screen py-8 bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/dashboard/admin" className="hover:text-teal-800 transition">
            لوحة الإدارة
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">طابور تذكيرات الجلسات</span>
        </div>

        <ReminderQueueDashboard reminders={reminders} csrfToken={csrfToken} />
      </div>
    </div>
  );
}
