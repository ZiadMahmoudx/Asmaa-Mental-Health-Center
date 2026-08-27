"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  BookOpen,
  Clock,
  Star,
  Users,
  CheckCircle2,
  Lock,
  Sparkles,
  Award,
  Video,
  X,
  CreditCard,
  Wallet,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { formatCurrency } from "@/lib/utils";
import { MentalHealthCourse } from "@/types/telehealth";

export default function AcademyPage() {
  const { language } = useLanguage();
  const { courses, enrolledCourseIds, purchaseCourse, currentUser } = useTelehealth();

  const [activeCourseModal, setActiveCourseModal] = useState<MentalHealthCourse | null>(null);
  const [playingModuleUrl, setPlayingModuleUrl] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  const handleEnroll = (courseId: string) => {
    setPurchaseError("");
    const success = purchaseCourse(courseId);
    if (success) {
      setPurchaseSuccess(true);
      setTimeout(() => setPurchaseSuccess(false), 3000);
    } else {
      setPurchaseError(
        language === "ar"
          ? "رصيد المحفظة غير كافٍ. يرجى شحن المحفظة من لوحة التحكم."
          : "Insufficient wallet balance. Please top up in your dashboard."
      );
    }
  };

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-900 text-xs font-bold border border-teal-200">
            <Award className="w-3.5 h-3.5 text-teal-700" />
            <span>{language === "ar" ? "أكاديمية أسما للصحة النفسية" : "Asmaa Mental Health Academy"}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-teal-950">
            {language === "ar" ? "ماستركلاس وكورسات التعافي الإكلينيكية" : "Psychiatric Masterclasses & Recovery Courses"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            {language === "ar"
              ? "برامج تدريبية علاجية متقدمة مصممة من قبل كبار الاستشاريين لتفكيك القلق، الهلع، وإدارة العلاقات."
              : "Evidence-based masterclasses designed by senior faculty to master panic relief and emotional resilience."}
          </p>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((course) => {
            const isEnrolled = enrolledCourseIds.includes(course.id);

            return (
              <div
                key={course.id}
                className="bg-white rounded-3xl border border-alabaster-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail & Video Trigger */}
                  <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <button
                        onClick={() => {
                          setActiveCourseModal(course);
                          setPlayingModuleUrl(course.modules[0]?.videoUrl || null);
                        }}
                        className="w-12 h-12 rounded-full bg-white/90 text-teal-900 flex items-center justify-center shadow-lg hover:scale-110 transition"
                      >
                        <Play className="w-5 h-5 fill-teal-900 mr-0.5" />
                      </button>
                    </div>

                    <span className="absolute top-3 right-3 bg-teal-950/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold">
                      {course.totalDuration}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span className="font-semibold text-sage-800">{course.instructorTitle}</span>
                      <div className="flex items-center text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-0.5 ml-0.5" />
                        <span>{course.rating}</span>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-base text-teal-950 group-hover:text-teal-800 transition leading-snug">
                      {language === "ar" ? course.title : course.titleEn}
                    </h3>

                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {language === "ar" ? course.description : course.descriptionEn}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
                      <span>{course.modules.length} {language === "ar" ? "وحدات تدريبية" : "modules"}</span>
                      <span>{course.enrolledStudents} {language === "ar" ? "مشترك" : "enrolled"}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Price & Action */}
                <div className="p-5 pt-0 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <span className="text-[10px] text-gray-400 block">
                        {language === "ar" ? "سعر الكورس" : "Course Price"}
                      </span>
                      <span className="font-black text-teal-900 text-base">
                        {formatCurrency(course.priceEGP, "EGP", language)}
                      </span>
                    </div>

                    {isEnrolled ? (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === "ar" ? "مشترك بالفعل" : "Enrolled"}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEnroll(course.id)}
                        className="px-5 py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                      >
                        {language === "ar" ? "اشتراك فوري" : "Enroll Now"}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveCourseModal(course)}
                    className="w-full text-center text-xs font-bold text-teal-800 hover:underline"
                  >
                    {language === "ar" ? "عرض محتويات الكورس والمنهج" : "View Curriculum"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Course Video Player & Syllabus Modal */}
        {activeCourseModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setActiveCourseModal(null);
                  setPlayingModuleUrl(null);
                }}
                className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-4 mb-6">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold">
                  {activeCourseModal.instructorName}
                </span>
                <h3 className="font-black text-xl text-teal-950">{activeCourseModal.title}</h3>

                {/* Video Player */}
                <div className="relative aspect-video rounded-2xl bg-teal-950 overflow-hidden shadow-lg border border-teal-800">
                  {playingModuleUrl ? (
                    <video
                      controls
                      autoPlay
                      src={playingModuleUrl}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-teal-300 gap-2">
                      <Lock className="w-8 h-8" />
                      <span className="text-xs font-bold">هذه الوحدة متاحة للمشتركين فقط</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modules List */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-gray-900">المنهج والوحدات التدريبية:</h4>
                <div className="space-y-2">
                  {activeCourseModal.modules.map((mod, idx) => (
                    <div
                      key={mod.id}
                      onClick={() => {
                        if (mod.isPreview || enrolledCourseIds.includes(activeCourseModal.id)) {
                          setPlayingModuleUrl(mod.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
                        }
                      }}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition cursor-pointer ${
                        mod.isPreview || enrolledCourseIds.includes(activeCourseModal.id)
                          ? "bg-teal-50/50 border-teal-200 hover:bg-teal-50 text-teal-950 font-bold"
                          : "bg-gray-50 border-gray-200 text-gray-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-white text-teal-800 flex items-center justify-center font-bold text-[11px] shadow-xs">
                          {idx + 1}
                        </span>
                        <span>{mod.title}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-gray-400">{mod.duration}</span>
                        {mod.isPreview ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            معاينة مجانية
                          </span>
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
