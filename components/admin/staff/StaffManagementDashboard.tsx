"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Edit2,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  Video,
  Building2,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
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
  const { language } = useLanguage();
  const isAr = language === "ar";

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
    <div className="space-y-6 text-start">
      {/* Top Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-800 border border-teal-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? "إدارة طاقم العمل والاستشاريين" : "Staff & Clinical Faculty Management"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? "إضافة أطباء جدد، تعيين موظفي الإدارة، وتعديل الصلاحيات وكلمات المرور."
                : "Add new consultants, invite administrative officers, and manage permissions & credentials."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateDoctor(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "إضافة استشاري جديد" : "Add Consultant"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateAdmin(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isAr ? "إضافة موظف إدارة" : "Add Admin Staff"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <Stethoscope className="w-4 h-4 text-teal-700" />
          <p className="text-[11px] text-slate-500 font-bold">{isAr ? "إجمالي الأطباء" : "Total Doctors"}</p>
          <p className="text-xl font-black text-slate-900">{doctors.length}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-[11px] text-slate-500 font-bold">{isAr ? "يستقبلون حجوزات" : "Accepting Patients"}</p>
          <p className="text-xl font-black text-emerald-700">
            {acceptingDoctorsCount} / {activeDoctorsCount}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <p className="text-[11px] text-slate-500 font-bold">{isAr ? "طاقم الإدارة والاستقبال" : "Admin Staff"}</p>
          <p className="text-xl font-black text-slate-900">{admins.length}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <CalendarClock className="w-4 h-4 text-amber-600" />
          <p className="text-[11px] text-slate-500 font-bold">{isAr ? "إجمالي فترات العمل" : "Active Windows"}</p>
          <p className="text-xl font-black text-slate-900">
            {doctors.reduce((sum, d) => sum + d.availabilityWindowsCount, 0)} {isAr ? "فترة" : "windows"}
          </p>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setTab("DOCTORS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              tab === "DOCTORS"
                ? "bg-teal-800 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>{isAr ? `الأطباء والاستشاريون (${doctors.length})` : `Consultants (${doctors.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("ADMINS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              tab === "ADMINS"
                ? "bg-teal-800 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isAr ? `طاقم الإدارة والاستقبال (${admins.length})` : `Admin Staff (${admins.length})`}</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className={`w-4 h-4 text-slate-400 absolute top-2.5 ${isAr ? "right-3" : "left-3"}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث بالاسم أو الهاتف أو البريد..." : "Search by name, phone, email..."}
            className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 ${
              isAr ? "pr-9 pl-3" : "pl-9 pr-3"
            }`}
          />
        </div>
      </div>

      {/* TAB 1: DOCTORS ROSTER TABLE */}
      {tab === "DOCTORS" && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold">{isAr ? "الاستشاري" : "Consultant"}</th>
                  <th className="p-4 font-bold">{isAr ? "الترخيص والتخصص" : "License & Credentials"}</th>
                  <th className="p-4 font-bold">{isAr ? "التسعير (أونلاين / عيادة)" : "Pricing (Online / Clinic)"}</th>
                  <th className="p-4 font-bold">{isAr ? "فترات العمل" : "Schedule"}</th>
                  <th className="p-4 font-bold">{isAr ? "الجلسات" : "Sessions"}</th>
                  <th className="p-4 font-bold">{isAr ? "حالة الحساب" : "Account Status"}</th>
                  <th className="p-4 font-bold text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold">
                      {isAr ? "لا يوجد أطباء يطابقون محددات البحث." : "No consultants match search criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="p-4 align-top">
                        <div className="font-bold text-slate-900 text-sm">
                          {doc.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">
                          {doc.email}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono" dir="ltr">{doc.phone}</div>
                      </td>

                      <td className="p-4 align-top">
                        <div className="font-semibold text-slate-800">
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {isAr ? "ترخيص: " : "Lic: "}{doc.licenseNumber} · {doc.yearsOfExperience} {isAr ? "سنوات خبرة" : "yrs exp"}
                        </div>
                        {doc.roomNumber && (
                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 border border-slate-200">
                            {isAr ? `غرفة ${doc.roomNumber}` : `Room ${doc.roomNumber}`}
                          </span>
                        )}
                      </td>

                      <td className="p-4 align-top font-mono font-bold whitespace-nowrap">
                        <div className="text-teal-700 flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          <span>{formatEgp(doc.sessionPriceOnline, isAr ? "ar" : "en")}</span>
                        </div>
                        <div className="text-blue-700 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          <span>{formatEgp(doc.sessionPriceOffline, isAr ? "ar" : "en")}</span>
                        </div>
                      </td>

                      <td className="p-4 align-top">
                        <span className="font-bold font-mono text-slate-800">
                          {doc.availabilityWindowsCount} {isAr ? "فترات" : "windows"}
                        </span>
                        {doc.availabilityWindowsCount === 0 && (
                          <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                            {isAr ? "غير منشور بالحجز" : "No published slots"}
                          </p>
                        )}
                      </td>

                      <td className="p-4 align-top font-mono">
                        <div className="text-slate-800 font-semibold">
                          {isAr ? "قادمة: " : "Upcoming: "}{doc.upcomingSessionsCount}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {isAr ? "مكتملة: " : "Completed: "}{doc.completedSessionsCount}
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
                            title={isAr ? "إدارة فترات العمل والإجازات" : "Manage Working Windows & Time Off"}
                            aria-label={isAr ? "إدارة فترات العمل والإجازات" : "Manage Working Windows & Time Off"}
                            className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition"
                          >
                            <CalendarClock className="w-4 h-4" />
                          </Link>

                          {/* Edit Full Profile */}
                          <button
                            type="button"
                            onClick={() => setEditingDoctor(doc)}
                            title={isAr ? "تعديل بيانات الاستشاري والأسعار" : "Edit Profile & Fees"}
                            aria-label={isAr ? "تعديل بيانات الاستشاري والأسعار" : "Edit Profile & Fees"}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
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
                                userRole: isAr ? "طبيب" : "Doctor",
                              })
                            }
                            title={isAr ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                            aria-label={isAr ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
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
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold">{isAr ? "اسم الموظف" : "Staff Name"}</th>
                  <th className="p-4 font-bold">{isAr ? "البريد الإلكتروني" : "Email"}</th>
                  <th className="p-4 font-bold">{isAr ? "رقم الهاتف" : "Phone"}</th>
                  <th className="p-4 font-bold">{isAr ? "الصلاحية" : "Role"}</th>
                  <th className="p-4 font-bold">{isAr ? "حالة الحساب" : "Account Status"}</th>
                  <th className="p-4 font-bold">{isAr ? "تاريخ الإنشاء" : "Created At"}</th>
                  <th className="p-4 font-bold text-center">{isAr ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold">
                      {isAr ? "لا يوجد موظفو إدارة يطابقون محددات البحث." : "No admin staff match search criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((adm) => (
                    <tr
                      key={adm.userId}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="p-4 font-bold text-slate-900 text-sm">
                        {adm.fullName}
                      </td>

                      <td className="p-4 font-mono text-slate-600" dir="ltr">
                        {adm.email}
                      </td>

                      <td className="p-4 font-mono text-slate-600" dir="ltr">
                        {adm.phone}
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                          {isAr ? "إدارة واستقبال" : "Administration & Desk"}
                        </span>
                      </td>

                      <td className="p-4">
                        <UserStatusToggle
                          userId={adm.userId}
                          userName={adm.fullName}
                          userRole={isAr ? "إدارة" : "Admin"}
                          isActive={adm.isActive}
                          csrfToken={csrfToken}
                        />
                      </td>

                      <td className="p-4 font-mono text-slate-500 text-[11px]">
                        {new Date(adm.createdAtUTC).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
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
                              userRole: isAr ? "إدارة" : "Admin",
                            })
                          }
                          title={isAr ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                          aria-label={isAr ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
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
