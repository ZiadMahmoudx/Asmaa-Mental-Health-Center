"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  DollarSign,
  FileBadge,
  Loader2,
  Lock,
  Mail,
  Phone,
  Plus,
  Stethoscope,
  Tag,
  User,
  Video,
  X,
} from "lucide-react";
import { createDoctorAction } from "@/app/actions/staff.actions";
import { CSRF_FIELD } from "@/lib/constants";
import { CONCERNS } from "@/lib/content/intake";

interface Props {
  csrfToken: string;
  onClose: () => void;
}

export function CreateDoctorModal({ csrfToken, onClose }: Props) {
  const router = useRouter();

  // Selected tags state
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([
    "علاج الاكتئاب",
    "اضطرابات القلق والهلع",
  ]);
  const [selectedConcernTags, setSelectedConcernTags] = useState<string[]>([
    "depression",
    "anxiety",
  ]);
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState("");

  const [state, formAction, isPending] = useActionState(createDoctorAction, null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

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
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                إضافة استشاري / طبيب جديد للمركز
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إنشاء حساب مستخدم جديد وملف طبي متكامل للظهور في منصة الحجز.
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

        {/* Success Screen */}
        {state?.ok ? (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-base">
              تم إنشاء حساب الطبيب بنجاح!
            </h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
              تم تفعيل الحساب فورياً. يمكن للطبيب الآن تسجيل الدخول، أو يمكنك التوجه إلى قسم{" "}
              <strong>مواعيد وجداول الأطباء</strong> لإضافة فترات عمله الأسبوعية.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-6">
            <input type="hidden" name={CSRF_FIELD} value={csrfToken} />
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

            {/* Section 1: User Account Credentials */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <User className="w-3.5 h-3.5" />
                ١. بيانات الحساب وتسجيل الدخول
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الاسم الكامل (د. ...) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="د. أحمد مصطفى"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    البريد الإلكتروني <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    dir="ltr"
                    placeholder="doctor@asmaaclinic.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهاتف المحمول <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    dir="ltr"
                    placeholder="01012345678"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    كلمة المرور المبدئية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    dir="ltr"
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">٨ أحرف على الأقل تشمل حرفاً كبيراً ورقماً.</p>
                </div>
              </div>
            </div>

            {/* Section 2: Clinical Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <FileBadge className="w-3.5 h-3.5" />
                ٢. البيانات المهنية والتراخيص
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اللقب المهني والتخصص <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="استشاري الطب النفسي وعلاج الإدمان"
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
                    placeholder="MOH-123456"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    سنوات الخبرة الإكلينيكية
                  </label>
                  <input
                    type="number"
                    name="yearsOfExperience"
                    defaultValue={5}
                    min={0}
                    max={60}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الغرفة / العيادة بالمركز
                  </label>
                  <input
                    type="text"
                    name="roomNumber"
                    placeholder="عيادة 3B (اختياري)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pricing */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                ٣. تسعير الجلسات (بالجنيه المصري EGP)
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
                    defaultValue={600}
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
                    defaultValue={750}
                    step={25}
                    min={50}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Concern Tags & Specialties */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <Tag className="w-3.5 h-3.5" />
                ٤. وسوم الفرز والتشخيص (لتوجيه المرضى في شاشة الفرز)
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
                  المجالات العلاجية والتخصصات المكتوبة:
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
                    placeholder="أضف تخصصاً (مثال: العلاج المعرفي السلوكي CBT)..."
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

            {/* Section 5: Biography */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                النبذة التعريفية والسيرة المهنية (Bio)
              </label>
              <textarea
                name="bioAr"
                rows={3}
                placeholder="نبذة مختصرة عن الطبيب، الشهادات الأكاديمية، والخبرات الإكلينيكية التي تظهر للمرضى..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            {/* Submit Toolbar */}
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
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                إنشاء وتفعيل حساب الاستشاري
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
