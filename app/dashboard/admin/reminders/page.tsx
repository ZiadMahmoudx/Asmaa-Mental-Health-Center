import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getPendingRemindersAction } from "@/app/actions/reminders.actions";
import { ReminderQueueDashboard } from "@/components/admin/reminders/ReminderQueueDashboard";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "طابور تذكيرات الجلسات | لوحة الإدارة"
        : "Session Reminder Queue | Admin Portal",
    description:
      lang === "ar"
        ? "متابعة وإرسال تذكيرات المواعيد القادمة للمرضى عبر واتساب."
        : "Monitor, trigger, and verify WhatsApp appointment reminders for scheduled consultations.",
  };
}

export const dynamic = "force-dynamic";

export default async function AdminRemindersPage() {
  const [_, lang] = await Promise.all([
    requireRolePage(["ADMIN"], "/dashboard/admin/reminders"),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  const [remindersResult, csrfToken] = await Promise.all([
    getPendingRemindersAction(),
    readCsrfToken(),
  ]);

  if (!remindersResult.ok) {
    return (
      <div className="min-h-screen py-16 bg-slate-50">
        <div className="max-w-lg mx-auto px-4 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
          <h1 className="text-lg font-black text-red-700">
            {isAr ? "تعذّر تحميل طابور التذكيرات" : "Unable to load reminder queue"}
          </h1>
          <p className="text-xs text-slate-600">
            {isAr ? remindersResult.messageAr : remindersResult.messageEn ?? remindersResult.messageAr}
          </p>
        </div>
      </div>
    );
  }

  const reminders = remindersResult.data;

  return (
    <div className="space-y-6">
      <ReminderQueueDashboard reminders={reminders} csrfToken={csrfToken} />
    </div>
  );
}
