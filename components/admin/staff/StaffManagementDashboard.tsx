"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Edit2,
  KeyRound,
  Mail,
  Phone,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
  Building2,
} from "lucide-react";
import type { AdminStaffRow, DoctorStaffRow } from "@/app/actions/staff.actions";
import { formatEgp } from "@/lib/whatsapp";
import { CreateDoctorModal } from "./CreateDoctorModal";
import { CreateAdminModal } from "./CreateAdminModal";
import { EditDoctorModal } from "./EditDoctorModal";
import { ResetPasswordModal } from "./ResetPasswordModal";
import { UserStatusToggle } from "./UserStatusToggle";

interface Props {
  doctors: DoctorStaffRow[];
  admins: AdminStaffRow[];
  csrfToken: string;
}

export function StaffManagementDashboard({ doctors, admins, csrfToken }: Props) {
  const [tab, setTab] = useState<"DOCTORS" | "ADMINS">("DOCTORS");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal triggers
  const [showCreateDoctor, setShowCreateDoctor] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorStaffRow | null>(null);
  const [resettingUser, setResettingUser] = useState<{
    userId: string;
    userName: string;
    userRole: string;
  } | null>(null);

  // Filtered lists
  const filteredDoctors = doctors.filter(
    (doc) =>
      doc.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.phone.includes(searchQuery) ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredAdmins = admins.filter(
    (adm) =>
      adm.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adm.phone.includes(searchQuery),
  );

  const activeDoctorsCount = doctors.filter((d) => d.isActive).length;
  const acceptingDoctorsCount = doctors.filter((d) => d.isAcceptingPatients && d.isActive).length;

  return (
    <div className="space-y-6">
      {/* Top Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              إدارة طاقم العمل والاستشاريين
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              إضافة أطباء جدد، تعيين موظفي الإدارة، وتعديل الصلاحيات وكلمات المرور.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateDoctor(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة استشاري جديد
          </button>

          <button
            type="button"
            onClick={() => setShowCreateAdmin(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            إضافة موظف إدارة
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <Stethoscope className="w-4 h-4 text-teal-600" />
          <p className="text-[11px] text-slate-400 font-bold">إجمالي الأطباء</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{doctors.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-[11px] text-slate-400 font-bold">يستقبلون حجوزات</p>
          <p className="text-xl font-black text-emerald-600">
            {acceptingDoctorsCount} / {activeDoctorsCount}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <p className="text-[11px] text-slate-400 font-bold">طاقم الإدارة والاستقبال</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{admins.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <CalendarClock className="w-4 h-4 text-amber-600" />
          <p className="text-[11px] text-slate-400 font-bold">إجمالي فترات العمل</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {doctors.reduce((sum, d) => sum + d.availabilityWindowsCount, 0)} فترة
          </p>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
          <button
            type="button"
            onClick={() => setTab("DOCTORS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              tab === "DOCTORS"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            الأطباء والاستشاريون ({doctors.length})
          </button>

          <button
            type="button"
            onClick={() => setTab("ADMINS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              tab === "ADMINS"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            طاقم الإدارة والاستقبال ({admins.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف أو البريد..."
            className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* TAB 1: DOCTORS ROSTER TABLE */}
      {tab === "DOCTORS" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4 font-bold">الاستشاري</th>
                  <th className="p-4 font-bold">الترخيص والتخصص</th>
                  <th className="p-4 font-bold">التسعير (أونلاين / عيادة)</th>
                  <th className="p-4 font-bold">فترات العمل</th>
                  <th className="p-4 font-bold">الجلسات</th>
                  <th className="p-4 font-bold">حالة الحساب</th>
                  <th className="p-4 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold">
                      لا يوجد أطباء يطابقون محددات البحث.
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="p-4 align-top">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {doc.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {doc.email}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{doc.phone}</div>
                      </td>

                      <td className="p-4 align-top">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ترخيص: {doc.licenseNumber} · {doc.yearsOfExperience} سنوات خبرة
                        </div>
                        {doc.roomNumber && (
                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                            {doc.roomNumber}
                          </span>
                        )}
                      </td>

                      <td className="p-4 align-top font-mono font-bold whitespace-nowrap">
                        <div className="text-teal-600 dark:text-teal-400 flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          {formatEgp(doc.sessionPriceOnline)}
                        </div>
                        <div className="text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {formatEgp(doc.sessionPriceOffline)}
                        </div>
                      </td>

                      <td className="p-4 align-top">
                        <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                          {doc.availabilityWindowsCount} فترات
                        </span>
                        {doc.availabilityWindowsCount === 0 && (
                          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            غير منشور بالحجز
                          </p>
                        )}
                      </td>

                      <td className="p-4 align-top font-mono">
                        <div className="text-slate-800 dark:text-slate-200 font-semibold">
                          قادمة: {doc.upcomingSessionsCount}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          مكتملة: {doc.completedSessionsCount}
                        </div>
                      </td>

                      <td className="p-4 align-top">
                        <UserStatusToggle
                          userId={doc.userId}
                          userName={doc.fullName}
                          userRole="طبيب"
                          isActive={doc.isActive}
                          csrfToken={csrfToken}
                        />
                      </td>

                      <td className="p-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Schedule Link */}
                          <Link
                            href={`/dashboard/admin/schedule?doctorId=${doc.id}`}
                            title="إدارة فترات العمل والإجازات"
                            className="p-1.5 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-lg transition"
                          >
                            <CalendarClock className="w-4 h-4" />
                          </Link>

                          {/* Edit Full Profile */}
                          <button
                            type="button"
                            onClick={() => setEditingDoctor(doc)}
                            title="تعديل بيانات الاستشاري والأسعار"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() =>
                              setResettingUser({
                                userId: doc.userId,
                                userName: doc.fullName,
                                userRole: "طبيب",
                              })
                            }
                            title="إعادة تعيين كلمة المرور"
                            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ADMIN STAFF ROSTER TABLE */}
      {tab === "ADMINS" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4 font-bold">اسم الموظف</th>
                  <th className="p-4 font-bold">البريد الإلكتروني</th>
                  <th className="p-4 font-bold">رقم الهاتف</th>
                  <th className="p-4 font-bold">الصلاحية</th>
                  <th className="p-4 font-bold">حالة الحساب</th>
                  <th className="p-4 font-bold">تاريخ الإنشاء</th>
                  <th className="p-4 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold">
                      لا يوجد موظفو إدارة يطابقون محددات البحث.
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((adm) => (
                    <tr
                      key={adm.userId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="p-4 font-bold text-slate-900 dark:text-white text-sm">
                        {adm.fullName}
                      </td>

                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                        {adm.email}
                      </td>

                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                        {adm.phone}
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800">
                          إدارة واستقبال
                        </span>
                      </td>

                      <td className="p-4">
                        <UserStatusToggle
                          userId={adm.userId}
                          userName={adm.fullName}
                          userRole="إدارة"
                          isActive={adm.isActive}
                          csrfToken={csrfToken}
                        />
                      </td>

                      <td className="p-4 font-mono text-slate-400 text-[11px]">
                        {new Date(adm.createdAtUTC).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setResettingUser({
                              userId: adm.userId,
                              userName: adm.fullName,
                              userRole: "إدارة",
                            })
                          }
                          title="إعادة تعيين كلمة المرور"
                          className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateDoctor && (
        <CreateDoctorModal
          csrfToken={csrfToken}
          onClose={() => setShowCreateDoctor(false)}
        />
      )}

      {showCreateAdmin && (
        <CreateAdminModal
          csrfToken={csrfToken}
          onClose={() => setShowCreateAdmin(false)}
        />
      )}

      {editingDoctor && (
        <EditDoctorModal
          doctor={editingDoctor}
          csrfToken={csrfToken}
          onClose={() => setEditingDoctor(null)}
        />
      )}

      {resettingUser && (
        <ResetPasswordModal
          userId={resettingUser.userId}
          userName={resettingUser.userName}
          userRole={resettingUser.userRole}
          csrfToken={csrfToken}
          onClose={() => setResettingUser(null)}
        />
      )}
    </div>
  );
}
