"use client";

import { useActionState, useState } from "react";
import {
  BellRing,
  Building2,
  CheckCircle2,
  MessageCircle,
  Search,
  Video,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
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
  const { language } = useLanguage();
  const isAr = language === "ar";

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
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? "طابور تذكيرات الجلسات عبر واتساب" : "WhatsApp Session Reminders Queue"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? "متابعة الجلسات القادمة خلال الـ 48 ساعة القادمة وإرسال رسائل التذكير المباشرة للمرضى."
                : "Monitor consultations scheduled within the next 48 hours and dispatch direct WhatsApp reminders."}
            </p>
          </div>
        </div>

        <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-center">
          <span className="text-[10px] text-slate-500 font-bold block">
            {isAr ? "جلسات بانتظار التذكير" : "Pending Reminders"}
          </span>
          <span className="text-xl font-black font-mono text-teal-800">{reminders.length}</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative">
          <Search className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? "right-3" : "left-3"}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isAr
                ? "البحث باسم المريض أو هاتفه أو الطبيب..."
                : "Search by patient name, phone, or consultant..."
            }
            className={`w-full py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700 ${
              isAr ? "pr-9 pl-3" : "pl-9 pr-3"
            }`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="p-4">{isAr ? "المريض" : "Patient"}</th>
                <th className="p-4">{isAr ? "الاستشاري" : "Consultant"}</th>
                <th className="p-4">{isAr ? "النوع" : "Format"}</th>
                <th className="p-4">{isAr ? "موعد الجلسة (بتوقيت القاهرة)" : "Session Time (Cairo)"}</th>
                <th className="p-4">{isAr ? "الوقت المتبقي" : "Time Remaining"}</th>
                <th className="p-4 text-center">{isAr ? "إجراءات التذكير" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-semibold">
                    {isAr
                      ? "لا توجد تذكيرات مستحقة حالياً. جميع الجلسات القادمة تم إرسال تذكيراتها."
                      : "No pending session reminders due at this time."}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.appointmentId} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{row.patientName}</div>
                      <div className="font-mono text-slate-400 text-[11px]" dir="ltr">{row.patientPhone}</div>
                    </td>

                    <td className="p-4 font-semibold text-slate-800">
                      {row.doctorName}
                      {row.roomNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {isAr ? `غرفة ${row.roomNumber}` : `Room ${row.roomNumber}`}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {row.type === "ONLINE" ? (
                          <>
                            <Video className="w-3 h-3 text-teal-700" />
                            <span>{isAr ? "أونلاين" : "Online"}</span>
                          </>
                        ) : (
                          <>
                            <Building2 className="w-3 h-3 text-blue-700" />
                            <span>{isAr ? "عيادة" : "In-Clinic"}</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-slate-900 tabular-nums">
                      {formatCairo(new Date(row.scheduledAtUTC), isAr ? "ar" : "en")}
                    </td>

                    <td className="p-4 space-y-1">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border tabular-nums ${
                          row.hoursUntilSession <= 24
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {isAr ? `خلال ${row.hoursUntilSession} ساعة` : `In ${row.hoursUntilSession} hrs`}
                      </span>
                      {row.hoursUntilSession >= 22 && row.hoursUntilSession <= 26 && (
                        <span className="block text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          {isAr ? "نطاق الإرسال الآلي (22–26 ساعة)" : "Automated Cron Horizon (22–26h)"}
                        </span>
                      )}
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
                          <span>{isAr ? "فتح الواتساب" : "WhatsApp"}</span>
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
                            <span>{isAr ? "تم الإرسال" : "Sent"}</span>
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
