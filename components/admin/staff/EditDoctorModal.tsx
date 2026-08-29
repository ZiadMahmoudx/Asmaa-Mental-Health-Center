"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  DollarSign,
  Edit2,
  FileBadge,
  Loader2,
  Plus,
  Tag,
  Video,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
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
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    doctor.specialties.length > 0
      ? doctor.specialties
      : [isAr ? "علاج الاكتئاب" : "Depression Treatment", isAr ? "اضطرابات القلق" : "Anxiety Disorders"],
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
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-start">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isAr ? `تعديل بيانات الاستشاري: ${doctor.fullName}` : `Edit Consultant Profile: ${doctor.fullName}`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? "تحديث اللقب، رقم الترخيص، الأسعار، ووسوم الفرز."
                  : "Update title, MOH license number, fees, and triage tags."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            aria-label={isAr ? "إغلاق" : "Close"}
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

          {!state?.ok && state && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {isAr ? state.messageAr : state.messageEn ?? state.messageAr}
            </div>
          )}

          {/* Section 1: Professional Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <FileBadge className="w-3.5 h-3.5" />
              <span>{isAr ? "١. البيانات المهنية والتراخيص" : "1. Credentials & Licensing"}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "اللقب المهني" : "Professional Title"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={doctor.title}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "رقم ترخيص مزاولة المهنة" : "MOH License Number"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  required
                  dir="ltr"
                  defaultValue={doctor.licenseNumber}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "سنوات الخبرة" : "Years of Experience"}
                </label>
                <input
                  type="number"
                  name="yearsOfExperience"
                  defaultValue={doctor.yearsOfExperience}
                  min={0}
                  max={60}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "رقم الغرفة / العيادة" : "Clinic Room / Suite"}
                </label>
                <input
                  type="text"
                  name="roomNumber"
                  defaultValue={doctor.roomNumber ?? ""}
                  placeholder={isAr ? "عيادة 3B" : "Room 3B"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>{isAr ? "٢. تسعير الجلسات (EGP)" : "2. Session Fees (EGP)"}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Video className="w-3 h-3 text-teal-700" />
                  <span>{isAr ? "سعر الجلسة أونلاين (زووم)" : "Online Session Fee (Zoom)"}</span>
                </label>
                <input
                  type="number"
                  name="sessionPriceOnline"
                  required
                  defaultValue={doctor.sessionPriceOnline}
                  step={25}
                  min={50}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-blue-700" />
                  <span>{isAr ? "سعر الزيارة الحضورية بالعيادة" : "In-Clinic Visit Fee"}</span>
                </label>
                <input
                  type="number"
                  name="sessionPriceOffline"
                  required
                  defaultValue={doctor.sessionPriceOffline}
                  step={25}
                  min={50}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Concern Tags & Specialties */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>{isAr ? "٣. وسوم الفرز والتشخيص" : "3. Triage Tags & Specialties"}</span>
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
                        ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-700"
                    }`}
                  >
                    {isAr ? c.labelAr : c.labelEn}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                {isAr ? "المجالات العلاجية والتخصصات:" : "Clinical Focus Areas / Subspecialties:"}
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
                  placeholder={isAr ? "أضف تخصصاً..." : "Add specialty..."}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={addSpecialty}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedSpecialties.map((sp) => (
                  <span
                    key={sp}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
                  >
                    {sp}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(sp)}
                      className="text-slate-400 hover:text-red-600"
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isAr ? "النبذة التعريفية والسيرة المهنية (Bio)" : "Professional Biography (Bio)"}
            </label>
            <textarea
              name="bioAr"
              rows={3}
              defaultValue={doctor.bioAr ?? ""}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isAr ? "حفظ التعديلات" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
