"use client";

import React from "react";
import { AlertTriangle, Calendar, Phone, User } from "lucide-react";
import type { AffectedAppointment } from "@/app/actions/doctor.actions";
import { formatCairo } from "@/lib/whatsapp";

interface Props {
  affected: AffectedAppointment[];
  horizonDays: number;
  confirmed: boolean;
  onConfirmChange: (checked: boolean) => void;
}

export function ImpactWarning({
  affected,
  horizonDays,
  confirmed,
  onConfirmChange,
}: Props) {
  if (affected.length === 0) return null;

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 text-sm text-right">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-900">
            تنبيه: يوجد {affected.length} حجز مؤكد يقع خارج النافذة الزمنية المعدلة
          </h4>
          <p className="text-xs text-amber-800 mt-1">
            تعديل أو إلغاء هذه النافذة لا يلغي حجوزات المرضى تلقائياً. ستبقى مواعيد هؤلاء المرضى قائمة في جدولك حتى تقوم بإعادة جدولتها أو التواصل معهم.
          </p>
        </div>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-1.5 border-t border-amber-200/80 pt-2">
        {affected.map((app) => (
          <div
            key={app.id}
            className="flex items-center justify-between p-2 rounded bg-white text-xs border border-amber-200/60 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-900">{app.patientName}</span>
              <span className="text-slate-500 font-mono">({app.patientPhone})</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatCairo(new Date(app.scheduledAtUTC))}</span>
            </div>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 pt-2 border-t border-amber-200/80 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmChange(e.target.checked)}
          className="rounded border-amber-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
          required
        />
        <span className="text-xs font-bold text-amber-900">
          أقرّ باطلاعي على الحجوزات المتأثرة وسأقوم بالتواصل مع المرضى أو إعادة جدولتها.
        </span>
      </label>
    </div>
  );
}
