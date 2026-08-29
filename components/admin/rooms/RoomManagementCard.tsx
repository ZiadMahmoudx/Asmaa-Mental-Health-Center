"use client";

import React, { useActionState, useState } from "react";
import { DoorOpen, Plus, Edit2, CheckCircle2, X, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  createClinicRoomAction,
  updateClinicRoomAction,
  toggleClinicRoomStatusAction,
  type ClinicRoomView,
} from "@/app/actions/rooms.actions";
import { CSRF_FIELD } from "@/lib/constants";

interface Props {
  rooms: ClinicRoomView[];
  csrfToken: string;
}

export function RoomManagementCard({ rooms, csrfToken }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [isAdding, setIsAdding] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ClinicRoomView | null>(null);

  const [createState, createAction, isCreatePending] = useActionState(createClinicRoomAction, null);
  const [updateState, updateAction, isUpdatePending] = useActionState(updateClinicRoomAction, null);
  const [_toggleState, toggleAction, isTogglePending] = useActionState(toggleClinicRoomStatusAction, null);

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-800 border border-teal-100 shrink-0">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isAr ? "غرف العيادة الفيزيائية" : "Clinic Physical Rooms"}
            </h2>
            <p className="text-xs text-slate-500">
              {isAr
                ? "تخصيص غرف الاستشارات للجلسات الحضورية ومنع التعارض الزمني."
                : "Manage consultation rooms for in-person appointments to prevent room clashes."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAdding(true);
            setEditingRoom(null);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? "إضافة غرفة جديدة" : "Add Room"}</span>
        </button>
      </div>

      {/* Add Room Modal / Inline Form */}
      {isAdding && (
        <form action={createAction} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              {isAr ? "إضافة غرفة استشارات جديدة" : "Add New Consultation Room"}
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                {isAr ? "اسم / رقم الغرفة *" : "Room Name / Number *"}
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder={isAr ? "مثال: غرفة الاستشارات ١" : "e.g. Room 1"}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                {isAr ? "الدور / الطابق" : "Floor"}
              </label>
              <input
                type="text"
                name="floor"
                placeholder={isAr ? "مثال: الدور الأول" : "e.g. 1st Floor"}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                {isAr ? "ملاحظات إضافية" : "Notes"}
              </label>
              <input
                type="text"
                name="notes"
                placeholder={isAr ? "مثال: غرفة الجلسات الفردية" : "e.g. Individual consults"}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>

          {createState && !createState.ok && (
            <p className="text-xs text-red-600 font-bold">{isAr ? createState.messageAr : createState.messageEn}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-white"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isCreatePending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {isCreatePending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isAr ? "حفظ الغرفة" : "Save Room"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Edit Room Modal / Inline Form */}
      {editingRoom && (
        <form action={updateAction} className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <input type="hidden" name="roomId" value={editingRoom.id} />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              {isAr ? `تعديل بيانات: ${editingRoom.name}` : `Edit: ${editingRoom.name}`}
            </span>
            <button
              type="button"
              onClick={() => setEditingRoom(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                {isAr ? "اسم / رقم الغرفة *" : "Room Name / Number *"}
              </label>
              <input
                type="text"
                name="name"
                defaultValue={editingRoom.name}
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                {isAr ? "الدور / الطابق" : "Floor"}
              </label>
              <input
                type="text"
                name="floor"
                defaultValue={editingRoom.floor ?? ""}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                {isAr ? "ملاحظات إضافية" : "Notes"}
              </label>
              <input
                type="text"
                name="notes"
                defaultValue={editingRoom.notes ?? ""}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>

          {updateState && !updateState.ok && (
            <p className="text-xs text-red-600 font-bold">{isAr ? updateState.messageAr : updateState.messageEn}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingRoom(null)}
              className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-white"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isUpdatePending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {isUpdatePending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isAr ? "تحديث الغرفة" : "Update Room"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Rooms Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-start">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
            <tr>
              <th className="p-3">{isAr ? "اسم الغرفة" : "Room Name"}</th>
              <th className="p-3">{isAr ? "الطابق" : "Floor"}</th>
              <th className="p-3">{isAr ? "السعة" : "Capacity"}</th>
              <th className="p-3">{isAr ? "ملاحظات" : "Notes"}</th>
              <th className="p-3">{isAr ? "الحالة" : "Status"}</th>
              <th className="p-3 text-center">{isAr ? "الإجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 font-semibold">
                  {isAr ? "لم يتم تسجيل أي غرف فيزيائية بعد." : "No clinic rooms registered yet."}
                </td>
              </tr>
            ) : (
              rooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-bold text-slate-900">{room.name}</td>
                  <td className="p-3 text-slate-600">{room.floor ?? "—"}</td>
                  <td className="p-3 font-mono text-slate-700">{room.capacity} {isAr ? "جلسة" : "session"}</td>
                  <td className="p-3 text-slate-500 max-w-[200px] truncate">{room.notes ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        room.isActive
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{room.isActive ? (isAr ? "نشطة" : "Active") : isAr ? "معطلة" : "Inactive"}</span>
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoom(room);
                          setIsAdding(false);
                        }}
                        className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                        title={isAr ? "تعديل الغرفة" : "Edit Room"}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <form action={toggleAction}>
                        <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
                        <input type="hidden" name="roomId" value={room.id} />
                        <button
                          type="submit"
                          disabled={isTogglePending}
                          className="text-[11px] font-bold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          {room.isActive ? (isAr ? "تعطيل" : "Deactivate") : isAr ? "تفعيل" : "Activate"}
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
  );
}
