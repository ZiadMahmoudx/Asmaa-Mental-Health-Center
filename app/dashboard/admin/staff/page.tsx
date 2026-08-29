import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getStaffRosterAction } from "@/app/actions/staff.actions";
import { StaffManagementDashboard } from "@/components/admin/staff/StaffManagementDashboard";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "إدارة طاقم العمل والأطباء | لوحة الإدارة"
        : "Staff & Doctor Management | Admin Portal",
    description:
      lang === "ar"
        ? "إضافة استشاريين، تعيين موظفي الإدارة، وتعديل الصلاحيات وبيانات التراخيص."
        : "Manage healthcare providers, admin credentials, license records, and user status.",
  };
}

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const [_, lang] = await Promise.all([
    requireRolePage(["ADMIN"], "/dashboard/admin/staff"),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  const [staffResult, csrfToken] = await Promise.all([
    getStaffRosterAction(),
    readCsrfToken(),
  ]);

  if (!staffResult.ok) {
    return (
      <div className="min-h-screen py-16 bg-slate-50">
        <div className="max-w-lg mx-auto px-4 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
          <h1 className="text-lg font-black text-red-700">
            {isAr ? "تعذّر تحميل قائمة طاقم العمل" : "Unable to load staff roster"}
          </h1>
          <p className="text-xs text-slate-600">
            {isAr ? staffResult.messageAr : staffResult.messageEn ?? staffResult.messageAr}
          </p>
        </div>
      </div>
    );
  }

  const { doctors, admins } = staffResult.data;

  return (
    <div className="min-h-screen py-8 bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/dashboard/admin" className="hover:text-teal-800 transition">
            {isAr ? "لوحة الإدارة" : "Admin Dashboard"}
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">
            {isAr ? "إدارة طاقم العمل" : "Staff Directory"}
          </span>
        </div>

        <StaffManagementDashboard
          doctors={doctors}
          admins={admins}
          csrfToken={csrfToken}
        />
      </div>
    </div>
  );
}
