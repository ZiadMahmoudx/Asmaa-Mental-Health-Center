import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  Filter,
  Search,
  Video,
  Building2,
} from "lucide-react";
import { requireRolePage } from "@/lib/auth/guards";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getDoctorRosterAction } from "@/app/actions/metrics.actions";
import { getAdminAppointmentsAction } from "@/app/actions/roster.actions";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants";
import { formatCairo, formatEgp } from "@/lib/whatsapp";
import { AdminAppointmentRowActions } from "@/components/admin/AdminAppointmentRowActions";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "سجل الحجوزات والعمليات | لوحة الإدارة"
        : "Bookings & Operations Ledger | Admin Portal",
    description:
      lang === "ar"
        ? "التحكم الشامل في جميع حجوزات المنصة، إعادة الجدولة، وإلغاء المواعيد."
        : "Comprehensive ledger for all consultations, status overrides, reschedulings, and cancellations.",
  };
}

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    doctorId?: string;
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function AdminAppointmentsPage({ searchParams }: Props) {
  const [_, lang] = await Promise.all([
    requireRolePage(["ADMIN"], "/dashboard/admin/appointments"),
    getLanguage(),
  ]);
  const isAr = lang === "ar";

  const { doctorId, status, search, page } = await searchParams;
  const currentPage = Number(page) || 1;
  const take = 50;
  const skip = (currentPage - 1) * take;

  const [rosterResult, appointmentsResult, csrfToken] = await Promise.all([
    getDoctorRosterAction(),
    getAdminAppointmentsAction({
      doctorId: doctorId || undefined,
      status: status || undefined,
      search: search || undefined,
      take,
      skip,
    }),
    readCsrfToken(),
  ]);

  const doctors = rosterResult.ok ? rosterResult.data : [];
  const { appointments, totalCount } = appointmentsResult.ok
    ? appointmentsResult.data
    : { appointments: [], totalCount: 0 };

  const totalPages = Math.ceil(totalCount / take);

  return (
    <div className="min-h-screen py-8 bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-800 border border-teal-100">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isAr ? "وحدة التحكم في الحجوزات والعمليات" : "Bookings & Operations Registry"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? `إجمالي ${totalCount} حجز مسجل في قاعدة البيانات.`
                  : `Total of ${totalCount} appointments recorded in registry.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin"
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
            >
              {isAr ? "لوحة الإدارة" : "Admin Portal"}
            </Link>
            <Link
              href="/dashboard/admin/schedule"
              className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              {isAr ? "إدارة جداول الأطباء" : "Roster Schedules"}
            </Link>
          </div>
        </div>

        {/* Filters Form */}
        <form
          method="GET"
          action="/dashboard/admin/appointments"
          className="p-4 bg-white border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-sm"
        >
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {isAr ? "بحث (الاسم / الهاتف)" : "Search (Name / Phone)"}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute end-3 top-3" />
              <input
                type="text"
                name="search"
                defaultValue={search ?? ""}
                placeholder={isAr ? "اسم المريض أو هاتفه..." : "Patient name or phone..."}
                className="w-full ps-3 pe-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {isAr ? "الاستشاري" : "Consultant"}
            </label>
            <select
              name="doctorId"
              defaultValue={doctorId ?? ""}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
            >
              <option value="">{isAr ? "جميع الاستشاريين" : "All Consultants"}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {isAr ? "حالة الحجز" : "Booking Status"}
            </label>
            <select
              name="status"
              defaultValue={status ?? "ALL"}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
            >
              <option value="ALL">{isAr ? "جميع الحالات" : "All Statuses"}</option>
              <option value="CONFIRMED">{isAr ? "مؤكد (CONFIRMED)" : "Confirmed (CONFIRMED)"}</option>
              <option value="PENDING_PAYMENT_PROOF">{isAr ? "بانتظار الإيصال (PENDING)" : "Awaiting Proof (PENDING)"}</option>
              <option value="PAYMENT_UNDER_REVIEW">{isAr ? "قيد المراجعة (UNDER_REVIEW)" : "Under Review (UNDER_REVIEW)"}</option>
              <option value="COMPLETED">{isAr ? "مكتمل (COMPLETED)" : "Completed (COMPLETED)"}</option>
              <option value="CANCELLED">{isAr ? "ملغي (CANCELLED)" : "Cancelled (CANCELLED)"}</option>
              <option value="EXPIRED">{isAr ? "منتهي (EXPIRED)" : "Expired (EXPIRED)"}</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{isAr ? "تطبيق التصفية" : "Apply Filter"}</span>
            </button>
            {(doctorId || status || search) && (
              <Link
                href="/dashboard/admin/appointments"
                className="px-3 py-2 border border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold"
              >
                {isAr ? "إعادة ضبط" : "Reset"}
              </Link>
            )}
          </div>
        </form>

        {/* Appointments Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-start">{isAr ? "المريض" : "Patient"}</th>
                  <th className="p-4 font-bold text-start">{isAr ? "الاستشاري" : "Consultant"}</th>
                  <th className="p-4 font-bold text-start">{isAr ? "النوع" : "Format"}</th>
                  <th className="p-4 font-bold text-start">{isAr ? "موعد الجلسة (بتوقيت القاهرة)" : "Scheduled (Cairo)"}</th>
                  <th className="p-4 font-bold text-start">{isAr ? "الحالة" : "Status"}</th>
                  <th className="p-4 font-bold text-start">{isAr ? "السعر" : "Price"}</th>
                  <th className="p-4 font-bold text-center">{isAr ? "الإجراءات والتحكم" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold">
                      {isAr ? "لا توجد حجوزات مسجلة تطابق محددات البحث." : "No appointment bookings match criteria."}
                    </td>
                  </tr>
                ) : (
                  appointments.map((app) => {
                    const statusBadge = APPOINTMENT_STATUS_LABELS[app.status] || { ar: app.status, en: app.status };
                    return (
                      <tr
                        key={app.id}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {app.patientName}
                          </div>
                          <div className="font-mono text-slate-400 text-[11px]" dir="ltr">
                            {app.patientPhone}
                          </div>
                        </td>

                        <td className="p-4 font-semibold text-slate-800">
                          {app.doctorName}
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {app.type === "ONLINE" ? (
                              <>
                                <Video className="w-3 h-3 text-teal-700" />
                                <span>{isAr ? "أونلاين" : "Online"}</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="w-3 h-3 text-blue-700" />
                                <span>{isAr ? "عيادة" : "In-clinic"}</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-900">
                            {formatCairo(new Date(app.scheduledAtUTC))}
                          </div>
                          {app.rescheduledFromUTC && (
                            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                              {isAr ? "معدل من: " : "Rescheduled from: "}
                              {formatCairo(new Date(app.rescheduledFromUTC))}
                            </div>
                          )}
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              app.status === "CONFIRMED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : app.status === "COMPLETED"
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : app.status === "CANCELLED"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {isAr ? statusBadge.ar : statusBadge.en}
                          </span>
                        </td>

                        <td className="p-4 font-mono font-bold text-teal-800">
                          {formatEgp(app.priceEGP)}
                        </td>

                        <td className="p-4 text-center">
                          <AdminAppointmentRowActions
                            appointment={app}
                            csrfToken={csrfToken}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-bold">
                {isAr ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
              </span>
              <div className="flex gap-1">
                {currentPage > 1 && (
                  <Link
                    href={`/dashboard/admin/appointments?page=${currentPage - 1}${
                      doctorId ? `&doctorId=${doctorId}` : ""
                    }${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {isAr ? "السابق" : "Previous"}
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    href={`/dashboard/admin/appointments?page=${currentPage + 1}${
                      doctorId ? `&doctorId=${doctorId}` : ""
                    }${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                    className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {isAr ? "التالي" : "Next"}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
