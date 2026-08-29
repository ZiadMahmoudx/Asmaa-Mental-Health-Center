"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSignature,
  Radio,
  Video,
} from "lucide-react";
import type { DoctorAgendaEntry } from "@/app/actions/doctor.actions";
import { formatCairo } from "@/lib/whatsapp";

interface Props {
  agenda: DoctorAgendaEntry[];
  isAr: boolean;
  onOpenSoapNote: (entry: DoctorAgendaEntry) => void;
}

export function LiveSessionBanner({ agenda, isAr, onOpenSoapNote }: Props) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);

  // Find a session happening right now (started within duration) or starting in next 30 mins
  const liveOrUpcoming = agenda.find((item) => {
    if (item.status !== "CONFIRMED") return false;
    const startMs = new Date(item.scheduledAtUTC).getTime();
    const endMs = startMs + item.durationMinutes * 60_000;
    // Current live session
    if (now >= startMs && now <= endMs) return true;
    // Next session within 30 minutes
    if (startMs > now && startMs - now <= 30 * 60_000) return true;
    return false;
  });

  if (!liveOrUpcoming) return null;

  const startMs = new Date(liveOrUpcoming.scheduledAtUTC).getTime();
  const endMs = startMs + liveOrUpcoming.durationMinutes * 60_000;
  const isLiveNow = now >= startMs && now <= endMs;
  const minsUntilStart = Math.ceil((startMs - now) / 60_000);
  const minsElapsed = Math.floor((now - startMs) / 60_000);
  const minsRemaining = Math.max(0, Math.ceil((endMs - now) / 60_000));

  return (
    <section
      aria-label={isAr ? "شريط الجلسة الحالية" : "Live Session Banner"}
      className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-teal-950 via-teal-900 to-teal-950 text-white border-2 border-teal-600/60 shadow-xl space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isLiveNow
                ? "bg-red-500 text-white animate-pulse shadow-md"
                : "bg-amber-400 text-slate-950"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>
              {isLiveNow
                ? isAr ? "جلسة جارية الآن" : "SESSION LIVE NOW"
                : isAr ? `تبدأ خلال ${minsUntilStart} دقيقة` : `STARTS IN ${minsUntilStart} MINS`}
            </span>
          </span>

          <span
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
              liveOrUpcoming.type === "ONLINE"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
            }`}
          >
            {liveOrUpcoming.type === "ONLINE" ? (
              <>
                <Video className="w-3.5 h-3.5" />
                <span>{isAr ? "أونلاين (Zoom)" : "Online (Zoom)"}</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5" />
                <span>{isAr ? "بالعيادة" : "In Clinic"}</span>
              </>
            )}
          </span>
        </div>

        {/* Live Elapsed / Remaining Timer */}
        {isLiveNow && (
          <div className="flex items-center gap-2 text-xs font-mono bg-teal-900/80 px-3 py-1.5 rounded-xl border border-teal-700/60">
            <Clock className="w-3.5 h-3.5 text-teal-300 animate-spin" />
            <span className="text-teal-200">
              {isAr ? `مضى ${minsElapsed} د` : `${minsElapsed}m elapsed`} ·{" "}
              <strong>{isAr ? `متبقي ${minsRemaining} د` : `${minsRemaining}m left`}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>{liveOrUpcoming.patientName}</span>
          </h2>
          <p className="text-xs text-teal-200 flex items-center gap-2">
            <span>{formatCairo(new Date(liveOrUpcoming.scheduledAtUTC), isAr ? "ar" : "en")}</span>
            <span>·</span>
            <span>{liveOrUpcoming.durationMinutes} {isAr ? "دقيقة" : "mins"}</span>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {liveOrUpcoming.type === "ONLINE" && liveOrUpcoming.zoomMeetingUrl && (
            <a
              href={liveOrUpcoming.zoomMeetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition inline-flex items-center gap-2 shadow-lg hover:shadow-blue-500/20"
            >
              <Video className="w-4 h-4" />
              <span>{isAr ? "دخول جلسة زووم" : "Join Zoom Room"}</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          )}

          <button
            type="button"
            onClick={() => onOpenSoapNote(liveOrUpcoming)}
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition inline-flex items-center gap-2 shadow-lg"
          >
            <FileSignature className="w-4 h-4" />
            <span>
              {liveOrUpcoming.hasClinicalRecord
                ? isAr ? "تعديل التقرير الطبي" : "Edit Clinical Note"
                : isAr ? "توثيق التقرير الطبي (SOAP)" : "Open SOAP Note"}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
