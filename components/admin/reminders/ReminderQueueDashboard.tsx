"use client";

import { useActionState, useState } from "react";
import {
  Bell,
  BellRing,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  Search,
  Send,
  Video,
} from "lucide-react";
import { formatCairo } from "@/lib/whatsapp";
import {
  markReminderSentAction,
  type PendingReminderRow,
} from "@/app/actions/reminders.actions";

interface Props {
  reminders: PendingReminderRow[];
  csrfToken: string;
}

export function ReminderQueueDashboard({ reminders, csrfToken }: Props) {
  const [search, setSearch] = useState("");
  const [state, formAction, isPending] = useActionState(markReminderSentAction, null);

  const filtered = reminders.filter((r) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      r.patientName.toLowerCase().includes(term) ||
      r.patientPhone.includes(term) ||
      r.doctorName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">طابور تذكيرات الجلسات عبر واتساب</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة الجلسات القادمة خلال الـ 48 ساعة القادمة وإرسال رسائل التذكير المباشرة للمرضى.
            </p>
          </div>
        </div>

        <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-center">
          <span className="text-[10px] text-slate-500 font-bold block">جلسات بانتظار التذكير</span>
          <span className="text-xl font-black font-mono text-teal-800">{reminders.length}</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث باسم المريض أو هاتفه أو الطبيب..."
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="p-4">المريض</th>
                <th className="p-4">الاستشاري</th>
                <th className="p-4">النوع</th>
                <th className="p-4">موعد الجلسة (بتوقيت القاهرة)</th>
                <th className="p-4">الوقت المتبقي</th>
                <th className="p-4 text-center">إجراءات التذكير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold">
                    لا توجد تذكيرات مستحقة حالياً. جميع الجلسات القادمة تم إرسال تذكيراتها.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.appointmentId} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{row.patientName}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{row.patientPhone}</div>
                    </td>

                    <td className="p-4 font-semibold text-slate-800">
                      {row.doctorName}
                      {row.roomNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">غرفة {row.roomNumber}</div>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {row.type === "ONLINE" ? (
                          <>
                            <Video className="w-3 h-3 text-teal-700" />
                            أونلاين
                          </>
                        ) : (
                          <>
                            <Building2 className="w-3 h-3 text-blue-700" />
                            عيادة
                          </>
                        )}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-slate-900">
                      {formatCairo(new Date(row.scheduledAtUTC))}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          row.hoursUntilSession <= 24
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        خلال {row.hoursUntilSession} ساعة
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={row.whatsappReminderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] transition flex items-center gap-1 shadow-sm"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          فتح الواتساب
                        </a>

                        <form action={formAction}>
                          <input type="hidden" name="csrfToken" value={csrfToken} />
                          <input type="hidden" name="appointmentId" value={row.appointmentId} />
                          <button
                            type="submit"
                            disabled={isPending}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            تم الإرسال
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
