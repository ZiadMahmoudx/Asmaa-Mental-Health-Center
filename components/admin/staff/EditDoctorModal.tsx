"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  DollarSign,
  Edit2,
  FileBadge,
  Loader2,
  Plus,
  Stethoscope,
  Tag,
  Video,
  X,
} from "lucide-react";
import type { DoctorStaffRow } from "@/app/actions/staff.actions";
import { updateDoctorFullProfileAction } from "@/app/actions/staff.actions";
import { CSRF_FIELD } from "@/lib/constants";
import { CONCERNS } from "@/lib/content/intake";

interface Props {
  doctor: DoctorStaffRow;
  csrfToken: string;
  onClose: () => void;
}

export function EditDoctorModal({ doctor, csrfToken, onClose }: Props) {
  const router = useRouter();

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    doctor.specialties.length > 0 ? doctor.specialties : ["علاج الاكتئاب", "اضطرابات القلق"],
  );
  const [selectedConcernTags, setSelectedConcernTags] = useState<string[]>(
    doctor.concernTags.length > 0 ? doctor.concernTags : ["depression", "anxiety"],
  );
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState("");

  const [state, formAction, isPending] = useActionState(updateDoctorFullProfileAction, null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  function toggleConcernTag(tag: string) {
    if (selectedConcernTags.includes(tag)) {
      if (selectedConcernTags.length > 1) {
        setSelectedConcernTags(selectedConcernTags.filter((t) => t !== tag));
      }
    } else {
      setSelectedConcernTags([...selectedConcernTags, tag]);
    }
  }

  function addSpecialty() {
    const trimmed = customSpecialtyInput.trim();
    if (trimmed && !selectedSpecialties.includes(trimmed)) {
      setSelectedSpecialties([...selectedSpecialties, trimmed]);
      setCustomSpecialtyInput("");
    }
  }

  function removeSpecialty(sp: string) {
    if (selectedSpecialties.length > 1) {
      setSelectedSpecialties(selectedSpecialties.filter((s) => s !== sp));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                تعديل بيانات الاستشاري: {doctor.fullName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديث اللقب، رقم الترخيص، الأسعار، ووسوم الفرز.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form action={formAction} className="space-y-6">
          <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
          <input type="hidden" name="doctorId" value={doctor.id} />
          <input
            type="hidden"
            name="specialtiesJson"
            value={JSON.stringify(selectedSpecialties)}
          />
          <input
            type="hidden"
            name="concernTagsJson"
            value={JSON.stringify(selectedConcernTags)}
          />

          {!state?.ok && state?.messageAr && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {state.messageAr}
            </div>
          )}

          {/* Section 1: Professional Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <FileBadge className="w-3.5 h-3.5" />
              ١. البيانات المهنية والتراخيص
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اللقب المهني <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={doctor.title}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم ترخيص مزاولة المهنة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  required
                  dir="ltr"
                  defaultValue={doctor.licenseNumber}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سنوات الخبرة
                </label>
                <input
                  type="number"
                  name="yearsOfExperience"
                  defaultValue={doctor.yearsOfExperience}
                  min={0}
                  max={60}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الغرفة / العيادة
                </label>
                <input
                  type="text"
                  name="roomNumber"
                  defaultValue={doctor.roomNumber ?? ""}
                  placeholder="عيادة 3B"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              ٢. تسعير الجلسات (EGP)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Video className="w-3 h-3 text-teal-600" />
                  سعر الجلسة أونلاين (زووم)
                </label>
                <input
                  type="number"
                  name="sessionPriceOnline"
                  required
                  defaultValue={doctor.sessionPriceOnline}
                  step={25}
                  min={50}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-blue-600" />
                  سعر الزيارة الحضورية بالعيادة
                </label>
                <input
                  type="number"
                  name="sessionPriceOffline"
                  required
                  defaultValue={doctor.sessionPriceOffline}
                  step={25}
                  min={50}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Concern Tags & Specialties */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <Tag className="w-3.5 h-3.5" />
              ٣. وسوم الفرز والتشخيص
            </h4>

            <div className="flex flex-wrap gap-2">
              {CONCERNS.map((c) => {
                const isSelected = selectedConcernTags.includes(c.tag);
                return (
                  <button
                    key={c.tag}
                    type="button"
                    onClick={() => toggleConcernTag(c.tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      isSelected
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-500"
                    }`}
                  >
                    {c.labelAr}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                المجالات العلاجية والتخصصات:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSpecialtyInput}
                  onChange={(e) => setCustomSpecialtyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSpecialty();
                    }
                  }}
                  placeholder="أضف تخصصاً..."
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={addSpecialty}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedSpecialties.map((sp) => (
                  <span
                    key={sp}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs border border-slate-200 dark:border-slate-700"
                  >
                    {sp}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(sp)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Biography */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              النبذة التعريفية والسيرة المهنية (Bio)
            </label>
            <textarea
              name="bioAr"
              rows={3}
              defaultValue={doctor.bioAr ?? ""}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
