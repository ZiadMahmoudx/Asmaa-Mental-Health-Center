"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Star,
  ShieldCheck,
  Calendar,
  Clock,
  Video,
  Award,
  BookOpen,
  X,
  Play,
  Check,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { formatCurrency } from "@/lib/utils";
import { DoctorProfile } from "@/types/telehealth";

export default function TherapistsDirectoryPage() {
  const { language } = useLanguage();
  const { doctors } = useTelehealth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [selectedMethodology, setSelectedMethodology] = useState<string>("ALL");
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [activeProfileModal, setActiveProfileModal] = useState<DoctorProfile | null>(null);

  // Extract all unique specialties & methodologies for filters
  const allSpecialties = Array.from(
    new Set(doctors.flatMap((d) => (language === "ar" ? d.specialties : d.specialtiesEn)))
  );

  const allMethodologies = Array.from(
    new Set(doctors.flatMap((d) => (language === "ar" ? d.methodologies : d.methodologiesEn)))
  );

  const filteredDoctors = doctors.filter((doc) => {
    const nameMatch =
      doc.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fullNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase());

    const specialtyMatch =
      selectedSpecialty === "ALL" ||
      (language === "ar"
        ? doc.specialties.includes(selectedSpecialty)
        : doc.specialtiesEn.includes(selectedSpecialty));

    const genderMatch = selectedGender === "ALL" || doc.gender === selectedGender;

    const methodologyMatch =
      selectedMethodology === "ALL" ||
      (language === "ar"
        ? doc.methodologies.includes(selectedMethodology)
        : doc.methodologiesEn.includes(selectedMethodology));

    const priceMatch = doc.sessionRateEGP <= maxPrice;

    return nameMatch && specialtyMatch && genderMatch && methodologyMatch && priceMatch;
  });

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Title & Tagline */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-900 text-xs font-bold border border-teal-200">
            <Award className="w-3.5 h-3.5 text-teal-700" />
            <span>{language === "ar" ? "نخبة الأطباء والاستشاريين" : "Accredited Clinical Faculty"}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-teal-950">
            {language === "ar" ? "دليل أطباء ومعالجي مركز أسما" : "Directory of Consultant Psychiatrists"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            {language === "ar"
              ? "ابحث بالاسم، التخصص الدقيق، أو المدرسة العلاجية واحجز جلستك المشفرة مباشرة."
              : "Filter by subspecialty, methodology, or clinical experience and book your private session."}
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-5 rounded-3xl border border-alabaster-border shadow-md space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute top-3.5 right-3.5 rtl:right-3.5 ltr:left-3.5 ltr:right-auto" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === "ar" ? "ابحث باسم الطبيب أو الكلمة الدلالية..." : "Search by doctor or keyword..."
                }
                className="w-full bg-alabaster-muted pr-10 pl-4 ltr:pl-10 ltr:pr-4 py-2.5 rounded-2xl text-xs text-gray-800 border border-alabaster-border focus:outline-none focus:border-teal-700"
              />
            </div>

            {/* Specialty Dropdown */}
            <div>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full bg-alabaster-muted px-4 py-2.5 rounded-2xl text-xs text-gray-800 border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
              >
                <option value="ALL">
                  {language === "ar" ? "جميع التخصصات النفسية" : "All Specialties"}
                </option>
                {allSpecialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="w-full bg-alabaster-muted px-4 py-2.5 rounded-2xl text-xs text-gray-800 border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
              >
                <option value="ALL">{language === "ar" ? "النوع (الكل)" : "Gender (All)"}</option>
                <option value="FEMALE">{language === "ar" ? "طبيبة / أخصائية" : "Female"}</option>
                <option value="MALE">{language === "ar" ? "طبيب / أخصائي" : "Male"}</option>
              </select>
            </div>

            {/* Methodology Filter */}
            <div>
              <select
                value={selectedMethodology}
                onChange={(e) => setSelectedMethodology(e.target.value)}
                className="w-full bg-alabaster-muted px-4 py-2.5 rounded-2xl text-xs text-gray-800 border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
              >
                <option value="ALL">
                  {language === "ar" ? "المدرسة العلاجية (الكل)" : "Methodology (All)"}
                </option>
                {allMethodologies.map((meth) => (
                  <option key={meth} value={meth}>
                    {meth}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-2">
          <span>
            {language === "ar"
              ? `عرض ${filteredDoctors.length} استشاري متاح للحجز`
              : `Showing ${filteredDoctors.length} available consultants`}
          </span>
        </div>

        {/* Doctors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-white rounded-3xl border border-alabaster-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Doctor Head Banner */}
                <div className="p-5 flex items-start gap-4 border-b border-gray-100 bg-alabaster-base/40">
                  <div className="relative">
                    <img
                      src={doctor.avatar}
                      alt={doctor.fullName}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                    />
                    <span className="absolute -bottom-1 -right-1 p-1 bg-teal-800 text-white rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="space-y-1 flex-1">
                    <h3 className="font-extrabold text-base text-teal-950 group-hover:text-teal-800 transition">
                      {language === "ar" ? doctor.fullName : doctor.fullNameEn}
                    </h3>
                    <p className="text-xs text-sage-700 font-bold leading-tight">
                      {language === "ar" ? doctor.title : doctor.titleEn}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-0.5">
                      <div className="flex items-center text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-0.5 ml-0.5" />
                        <span>{doctor.rating}</span>
                      </div>
                      <span>•</span>
                      <span>{doctor.totalReviews} {language === "ar" ? "تقييم" : "reviews"}</span>
                    </div>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-5 space-y-4">
                  {/* Bio snippet */}
                  <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                    {language === "ar" ? doctor.bio : doctor.bioEn}
                  </p>

                  {/* Specialties Pills */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">
                      {language === "ar" ? "التخصصات الدقيقة:" : "Subspecialties:"}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(language === "ar" ? doctor.specialties : doctor.specialtiesEn).slice(0, 3).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-900 text-[11px] font-medium border border-teal-100"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Next slot badge */}
                  <div className="p-2.5 rounded-xl bg-sage-50 border border-sage-200/60 text-xs flex items-center justify-between text-sage-900">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sage-700" />
                      <span className="font-semibold">{language === "ar" ? "أقرب موعد:" : "Next Slot:"}</span>
                    </div>
                    <span className="font-bold text-teal-900">
                      {language === "ar" ? doctor.nextAvailableSlot : doctor.nextAvailableSlotEn}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 pt-0 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between pt-3 pb-1">
                  <div>
                    <span className="text-[10px] text-gray-400 block">
                      {language === "ar" ? "قيمة الجلسة (45 دقيقة)" : "Session Fee (45m)"}
                    </span>
                    <span className="text-base font-black text-teal-900">
                      {formatCurrency(doctor.sessionRateEGP, "EGP", language)}
                    </span>
                  </div>

                  <button
                    onClick={() => setActiveProfileModal(doctor)}
                    className="text-xs font-bold text-teal-800 hover:text-teal-950 underline"
                  >
                    {language === "ar" ? "عرض السيرة الذاتية" : "Full Bio"}
                  </button>
                </div>

                <Link
                  href={`/booking/${doctor.id}`}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-xs shadow-md transition"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{language === "ar" ? "احجز موعداً مع الطبيب" : "Book Session"}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Full Doctor Profile Modal */}
        {activeProfileModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setActiveProfileModal(null)}
                className="absolute top-4 left-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4 mb-6">
                <img
                  src={activeProfileModal.avatar}
                  alt={activeProfileModal.fullName}
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-teal-100 shadow"
                />
                <div className="space-y-1 flex-1">
                  <h3 className="font-black text-xl text-teal-950">
                    {language === "ar" ? activeProfileModal.fullName : activeProfileModal.fullNameEn}
                  </h3>
                  <p className="text-xs sm:text-sm text-sage-800 font-bold">
                    {language === "ar" ? activeProfileModal.title : activeProfileModal.titleEn}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {language === "ar" ? "ترخيص مزاولة المهنة:" : "Medical License:"}{" "}
                    <span className="font-mono text-gray-700">{activeProfileModal.licenseNumber}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-5 text-xs text-gray-700">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-gray-900 text-sm">
                    {language === "ar" ? "عن الاستشاري والخبرات السريرية:" : "About & Clinical Background:"}
                  </h4>
                  <p className="leading-relaxed">
                    {language === "ar" ? activeProfileModal.bio : activeProfileModal.bioEn}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-gray-900 text-sm">
                    {language === "ar" ? "المؤهلات العلمية والزمالات:" : "Education & Credentials:"}
                  </h4>
                  <ul className="space-y-1 list-disc list-inside text-gray-600">
                    {(language === "ar" ? activeProfileModal.education : activeProfileModal.educationEn).map((edu, i) => (
                      <li key={i}>{edu}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-gray-900 text-sm">
                    {language === "ar" ? "المدارس والتقنيات العلاجية:" : "Therapeutic Methodologies:"}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(language === "ar" ? activeProfileModal.methodologies : activeProfileModal.methodologiesEn).map((m, i) => (
                      <span key={i} className="px-2.5 py-1 bg-sage-50 text-sage-900 rounded-lg font-semibold">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Patient Reviews */}
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-gray-900 text-sm">
                    {language === "ar" ? "آراء المرضى الموثقة:" : "Verified Patient Reviews:"}
                  </h4>
                  <div className="space-y-2">
                    {activeProfileModal.reviews.map((rev) => (
                      <div key={rev.id} className="p-3 bg-alabaster-base rounded-xl border border-alabaster-border space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-teal-900">{rev.patientName}</span>
                          <div className="flex text-amber-500">
                            {[...Array(rev.rating)].map((_, idx) => (
                              <Star key={idx} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block">
                    {language === "ar" ? "سعر الجلسة" : "Session Fee"}
                  </span>
                  <span className="font-black text-teal-900 text-lg">
                    {formatCurrency(activeProfileModal.sessionRateEGP, "EGP", language)}
                  </span>
                </div>

                <Link
                  href={`/booking/${activeProfileModal.id}`}
                  onClick={() => setActiveProfileModal(null)}
                  className="px-8 py-3 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs shadow-md transition"
                >
                  {language === "ar" ? "الانتقال لاختيار الموعد والدفع" : "Proceed to Booking"}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
