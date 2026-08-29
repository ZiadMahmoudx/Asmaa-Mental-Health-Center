import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  Filter,
  Search,
  Video,
  Building2,
  FileCheck,
  FileQuestion,
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
        ? "التحكم الشامل في جميع حجوزات المنصة، وإلغاء المواعيد."
        : "Comprehensive ledger for all consultations, status overrides, and cancellations.",
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

  const { doctorId, status = "ALL", search, page } = await searchParams;
  const currentPage = Number(page) || 1;
  const take = 50;
  const skip = (currentPage - 1) * take;

  const [rosterResult, appointmentsResult, csrfToken] = await Promise.all([
    getDoctorRosterAction(),
    getAdminAppointmentsAction({
      doctorId: doctorId || undefined,
      status: status !== "ALL" ? status : undefined,
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

  const statusPills = [
    { id: "ALL", ar: "الكل", en: "All" },
    { id: "CONFIRMED", ar: "مؤكد", en: "Confirmed" },
    { id: "PAYMENT_UNDER_REVIEW", ar: "قيد المراجعة", en: "Under Review" },
    { id: "PENDING_PAYMENT_PROOF", ar: "بانتظار الإيصال", en: "Awaiting Proof" },
    { id: "COMPLETED", ar: "مكتمل", en: "Completed" },
    { id: "CANCELLED", ar: "ملغي", en: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-800 border border-teal-100 shrink-0">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              {isAr ? "سجل الحجوزات والرقابة التشغيلية" : "Bookings & Operations Registry"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? `إجمالي ${totalCount} حجز مسجل في قاعدة البيانات`
                : `Total of ${totalCount} appointments in system`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/schedule"
            className="px-4 py-2.5 bg-teal-900 hover:bg-teal-800 text-white rounded-2xl text-xs font-bold transition shadow-sm"
          >
            {isAr ? "إدارة جداول الأطباء" : "Roster Schedules"}
          </Link>
        </div>
      </div>

      {/* Quick Status Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {statusPills.map((pill) => {
          const isSelected = status === pill.id;
          const queryParams = new URLSearchParams();
          if (pill.id !== "ALL") queryParams.set("status", pill.id);
          if (doctorId) queryParams.set("doctorId", doctorId);
          if (search) queryParams.set("search", search);
          const href = `/dashboard/admin/appointments${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

          return (
            <Link
              key={pill.id}
              href={href}
              aria-current={isSelected ? "page" : undefined}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap border ${
                isSelected
                  ? "bg-teal-900 text-white border-teal-900 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {isAr ? pill.ar : pill.en}
            </Link>
          );
        })}
      </div>

      {/* Search & Doctor Filters Form */}
      <form
        method="GET"
        action="/dashboard/admin/appointments"
        className="p-4 bg-white border border-slate-200 rounded-3xl grid grid-cols-1 sm:grid-cols-12 gap-3 shadow-sm"
      >
        <div className="sm:col-span-5">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            {isAr ? "بحث فوري (الاسم / رقم الهاتف)" : "Instant Search (Name / Phone)"}
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              defaultValue={search ?? ""}
              placeholder={isAr ? "ابحث باسم المريض أو رقم هاتفه..." : "Patient name or phone..."}
              className="w-full ps-10 pe-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            {isAr ? "الاستشاري" : "Consultant"}
          </label>
          <select
            name="doctorId"
            defaultValue={doctorId ?? ""}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-700"
          >
            <option value="">{isAr ? "جميع الاستشاريين" : "All Consultants"}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </select>
        </div>

        {status && status !== "ALL" && (
          <input type="hidden" name="status" value={status} />
        )}

        <div className="sm:col-span-3 flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 py-2.5 bg-teal-900 hover:bg-teal-800 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isAr ? "تطبيق التصفية" : "Filter"}</span>
          </button>
          {(doctorId || search || (status && status !== "ALL")) && (
            <Link
              href="/dashboard/admin/appointments"
              className="px-3.5 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-2xl text-xs font-bold"
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
                <th className="p-4 font-bold text-start">{isAr ? "التقرير الإكلينيكي" : "Clinical Note"}</th>
                <th className="p-4 font-bold text-start">{isAr ? "السعر" : "Price"}</th>
                <th className="p-4 font-bold text-center">{isAr ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 font-semibold">
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
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
                        <div className="font-bold text-slate-900 tabular-nums">
                          {formatCairo(new Date(app.scheduledAtUTC), lang)}
                        </div>
                        {app.rescheduledFromUTC && (
                          <div className="text-[10px] text-amber-700 font-semibold mt-0.5 tabular-nums">
                            {isAr ? "معدل من: " : "Rescheduled from: "}
                            {formatCairo(new Date(app.rescheduledFromUTC), lang)}
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

                      <td className="p-4">
                        {app.hasClinicalRecord ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <FileCheck className="w-3 h-3 text-emerald-600" />
                            <span>{isAr ? "تم التدوين" : "Documented"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                            <FileQuestion className="w-3 h-3 text-slate-400" />
                            <span>{isAr ? "لم يدون بعد" : "Pending Note"}</span>
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-mono font-bold text-teal-900 tabular-nums">
                        {formatEgp(app.priceEGP, lang)}
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
            <span className="text-slate-600 font-bold tabular-nums">
              {isAr ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </span>
            <div className="flex gap-1.5">
              {currentPage > 1 && (
                <Link
                  href={`/dashboard/admin/appointments?page=${currentPage - 1}${
                    doctorId ? `&doctorId=${doctorId}` : ""
                  }${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  {isAr ? "السابق" : "Previous"}
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/dashboard/admin/appointments?page=${currentPage + 1}${
                    doctorId ? `&doctorId=${doctorId}` : ""
                  }${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  {isAr ? "التالي" : "Next"}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
