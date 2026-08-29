"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  DollarSign,
  FileBadge,
  Loader2,
  Plus,
  Stethoscope,
  Tag,
  User,
  Video,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { createDoctorAction } from "@/app/actions/staff.actions";
import { CSRF_FIELD } from "@/lib/constants";
import { CONCERNS } from "@/lib/content/intake";

interface Props {
  csrfToken: string;
  onClose: () => void;
}

export function CreateDoctorModal({ csrfToken, onClose }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const router = useRouter();

  // Selected tags state
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([
    isAr ? "علاج الاكتئاب" : "Depression Treatment",
    isAr ? "اضطرابات القلق والهلع" : "Anxiety & Panic Disorders",
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
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-start">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-800 border border-teal-100">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isAr ? "إضافة استشاري / طبيب جديد للمركز" : "Add New Consultant / Doctor"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? "إنشاء حساب مستخدم جديد وملف طبي متكامل للظهور في منصة الحجز."
                  : "Create new user account and clinical profile for public booking."}
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

        {/* Success Screen */}
        {state?.ok ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-emerald-900 text-base">
              {isAr ? "تم إنشاء حساب الطبيب بنجاح!" : "Doctor Account Created Successfully!"}
            </h4>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">
              {isAr
                ? "تم تفعيل الحساب فورياً. يمكن للطبيب الآن تسجيل الدخول، أو يمكنك التوجه إلى قسم مواعيد وجداول الأطباء لإضافة فترات عمله الأسبوعية."
                : "Account is active. The consultant can now log in, or you can manage their weekly availability schedule."}
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isAr ? "إغلاق" : "Close"}
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

            {!state?.ok && state && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {isAr ? state.messageAr : state.messageEn ?? state.messageAr}
              </div>
            )}

            {/* Section 1: User Account Credentials */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <User className="w-3.5 h-3.5" />
                <span>{isAr ? "١. بيانات الحساب وتسجيل الدخول" : "1. Account & Login Credentials"}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? "الاسم الكامل (د. ...)" : "Full Name (Dr. ...)"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder={isAr ? "د. أحمد مصطفى" : "Dr. Ahmed Mostafa"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? "البريد الإلكتروني" : "Email Address"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    dir="ltr"
                    placeholder="doctor@asmaaclinic.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? "رقم الهاتف المحمول" : "Mobile Number"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    dir="ltr"
                    placeholder="01012345678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? "كلمة المرور المبدئية" : "Initial Password"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    dir="ltr"
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isAr ? "٨ أحرف على الأقل تشمل حرفاً كبيراً ورقماً." : "Min 8 chars, uppercase & digit required."}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Clinical Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <FileBadge className="w-3.5 h-3.5" />
                <span>{isAr ? "٢. البيانات المهنية والتراخيص" : "2. Credentials & Licensing"}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? "اللقب المهني والتخصص" : "Professional Title"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder={isAr ? "استشاري الطب النفسي وعلاج الإدمان" : "Consultant Psychiatrist"}
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
                    placeholder="MOH-123456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? "سنوات الخبرة الإكلينيكية" : "Years of Experience"}
                  </label>
                  <input
                    type="number"
                    name="yearsOfExperience"
                    defaultValue={5}
                    min={0}
                    max={60}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isAr ? "رقم الغرفة / العيادة بالمركز" : "Clinic Room / Suite Number"}
                  </label>
                  <input
                    type="text"
                    name="roomNumber"
                    placeholder={isAr ? "عيادة 3B (اختياري)" : "Room 3B (Optional)"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pricing */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{isAr ? "٣. تسعير الجلسات (بالجنيه المصري EGP)" : "3. Consultation Fees (EGP)"}</span>
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
                    defaultValue={600}
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
                    defaultValue={750}
                    step={25}
                    min={50}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Concern Tags & Specialties */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>{isAr ? "٤. وسوم الفرز والتشخيص (لتوجيه المرضى في شاشة الفرز)" : "4. Clinical Triage Tags & Specialties"}</span>
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
                  {isAr ? "المجالات العلاجية والتخصصات المكتوبة:" : "Clinical Focus Areas / Subspecialties:"}
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
                    placeholder={isAr ? "أضف تخصصاً (مثال: العلاج المعرفي السلوكي CBT)..." : "Add specialty (e.g. CBT)..."}
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

            {/* Section 5: Biography */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isAr ? "النبذة التعريفية والسيرة المهنية (Bio)" : "Professional Biography (Bio)"}
              </label>
              <textarea
                name="bioAr"
                rows={3}
                placeholder={
                  isAr
                    ? "نبذة مختصرة عن الطبيب، الشهادات الأكاديمية، والخبرات الإكلينيكية التي تظهر للمرضى..."
                    : "Brief clinical bio, academic degrees, and expertise displayed to patients..."
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>

            {/* Submit Toolbar */}
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
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isAr ? "إنشاء وتفعيل حساب الاستشاري" : "Create & Activate Consultant"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
