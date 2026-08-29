import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldAlert, Users } from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getStaffRosterAction } from "@/app/actions/staff.actions";
import { StaffManagementDashboard } from "@/components/admin/staff/StaffManagementDashboard";

export const metadata: Metadata = {
  title: "إدارة طاقم العمل والأطباء | لوحة الإدارة",
  description: "إضافة استشاريين، تعيين موظفي الإدارة، وتعديل الصلاحيات وبيانات التراخيص.",
};

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  await requireRolePage(["ADMIN"], "/dashboard/admin/staff");

  const [staffResult, csrfToken] = await Promise.all([
    getStaffRosterAction(),
    readCsrfToken(),
  ]);

  if (!staffResult.ok) {
    return (
      <div className="min-h-screen py-16 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-lg mx-auto px-4 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
          <h1 className="text-lg font-black text-red-700">تعذّر تحميل قائمة طاقم العمل</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">{staffResult.messageAr}</p>
        </div>
      </div>
    );
  }

  const { doctors, admins } = staffResult.data;

  return (
    <div className="min-h-screen py-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/dashboard/admin" className="hover:text-teal-600 transition">
            لوحة الإدارة
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-bold">إدارة طاقم العمل</span>
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
