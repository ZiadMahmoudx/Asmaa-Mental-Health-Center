"use client";

import React, { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  BadgeCheck,
  Building2,
  GraduationCap,
  Stethoscope,
  Video,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { ClinicalAvatar } from "@/components/common/ClinicalAvatar";
import type { DoctorCardView } from "@/app/actions/doctors.actions";
import { formatEgp } from "@/lib/whatsapp";

type SessionFormat = "ALL" | "ONLINE" | "OFFLINE";

const SESSION_FORMATS: Array<{ id: SessionFormat; labelAr: string; labelEn: string }> = [
  { id: "ALL", labelAr: "الكل", labelEn: "All" },
  { id: "ONLINE", labelAr: "أونلاين (زووم)", labelEn: "Online (Zoom)" },
  { id: "OFFLINE", labelAr: "زيارة بالعيادة", labelEn: "In-Clinic Visit" },
];

interface Props {
  doctors: DoctorCardView[] | null;
  errorMessage?: { ar: string; en?: string };
}

export function TherapistsDirectory({ doctors, errorMessage }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Read URL search params
  const urlQuery = searchParams.get("q") ?? "";
  const urlSpecialty = searchParams.get("specialty") ?? "ALL";
  const rawFormat = searchParams.get("format");
  const urlFormat: SessionFormat =
    rawFormat === "ONLINE" || rawFormat === "OFFLINE" ? rawFormat : "ALL";
  const urlAvailable = searchParams.get("available") === "true";

  // Local state for snappy typing in search
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [selectedSpecialty, setSelectedSpecialty] = useState(urlSpecialty);
  const [sessionFormat, setSessionFormat] = useState<SessionFormat>(urlFormat);
  const [availabilityOnly, setAvailabilityOnly] = useState(urlAvailable);

  // Sync to URL
  const pushFiltersToUrl = useCallback(
    (q: string, specialty: string, format: SessionFormat, available: boolean) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (specialty !== "ALL") params.set("specialty", specialty);
      if (format !== "ALL") params.set("format", format);
      if (available) params.set("available", "true");

      const queryString = params.toString();
      const target = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.replace(target, { scroll: false });
      });
    },
    [pathname, router],
  );

  // Handlers
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    pushFiltersToUrl(val, selectedSpecialty, sessionFormat, availabilityOnly);
  };

  const handleSpecialtyChange = (spec: string) => {
    setSelectedSpecialty(spec);
    pushFiltersToUrl(searchQuery, spec, sessionFormat, availabilityOnly);
  };

  const handleFormatChange = (fmt: SessionFormat) => {
    setSessionFormat(fmt);
    pushFiltersToUrl(searchQuery, selectedSpecialty, fmt, availabilityOnly);
  };

  const handleAvailabilityToggle = () => {
    const next = !availabilityOnly;
    setAvailabilityOnly(next);
    pushFiltersToUrl(searchQuery, selectedSpecialty, sessionFormat, next);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSpecialty("ALL");
    setSessionFormat("ALL");
    setAvailabilityOnly(false);
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  // Extract all unique specialties across all doctors
  const allSpecialties = useMemo(() => {
    if (!doctors) return [];
    const set = new Set<string>();
    for (const doc of doctors) {
      const specs = isAr ? doc.specialties : doc.specialtiesEn.length > 0 ? doc.specialtiesEn : doc.specialties;
      specs.forEach((s) => set.add(s));
    }
    return Array.from(set);
  }, [doctors, isAr]);

  // Helper for offered mode minimum price
  function getMinOfferedPrice(doctor: DoctorCardView): number | null {
    const prices: number[] = [];
    if (doctor.offersOnline && doctor.priceOnlineEGP > 0) prices.push(doctor.priceOnlineEGP);
    if (doctor.offersOffline && doctor.priceOfflineEGP > 0) prices.push(doctor.priceOfflineEGP);
    return prices.length > 0 ? Math.min(...prices) : null;
  }

  // Filter doctors
  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];
    return doctors.filter((doc) => {
      // Search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = doc.fullName.toLowerCase().includes(query);
        const titleMatch =
          doc.title.toLowerCase().includes(query) ||
          (doc.titleEn?.toLowerCase().includes(query) ?? false);
        const bioMatch =
          doc.bio.toLowerCase().includes(query) ||
          (doc.bioEn?.toLowerCase().includes(query) ?? false);
        if (!nameMatch && !titleMatch && !bioMatch) return false;
      }

      // Specialty
      if (selectedSpecialty !== "ALL") {
        const specs = isAr ? doc.specialties : doc.specialtiesEn.length > 0 ? doc.specialtiesEn : doc.specialties;
        if (!specs.includes(selectedSpecialty)) return false;
      }

      // Session format
      if (sessionFormat === "ONLINE" && !doc.offersOnline) return false;
      if (sessionFormat === "OFFLINE" && !doc.offersOffline) return false;

      // Availability
      if (availabilityOnly && !doc.isAcceptingPatients) return false;

      return true;
    });
  }, [doctors, searchQuery, selectedSpecialty, sessionFormat, availabilityOnly, isAr]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedSpecialty !== "ALL" ||
    sessionFormat !== "ALL" ||
    availabilityOnly;

  return (
    <div className="space-y-8">
      {/* Bilingual Page Header */}
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-teal-950">
          {isAr ? "الأطباء والمعالجون بالمركز" : "Consultant Psychiatrists & Psychotherapists"}
        </h1>
        <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
          {isAr
            ? "نخبة من استشاريي الطب النفسي وأخصائيي علم النفس الإكلينيكي المعتمدين. اختر الاستشاري الأنسب لحالتك واحجز جلسة أونلاين عبر زووم أو زيارة حضورية بمقر العيادة."
            : "A distinguished faculty of licensed consultant psychiatrists and clinical psychologists. Select the right specialist for your care and book an online Zoom consultation or an in-clinic appointment."}
        </p>
      </header>

      {/* Error state if load failed */}
      {errorMessage && (
        <div className="bg-red-50 rounded-3xl border border-red-200 p-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-crisis mx-auto" />
          <h2 className="text-base font-black text-crisis-dark">
            {isAr ? "تعذّر تحميل قائمة الأطباء" : "Unable to load consultant directory"}
          </h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            {isAr ? errorMessage.ar : errorMessage.en ?? errorMessage.ar}
          </p>
        </div>
      )}

      {doctors && (
        <>
          {/* Search and Filters Bar */}
          <div className="bg-white rounded-3xl border border-alabaster-border shadow-sm p-5 sm:p-6 space-y-4">
            {/* Search Input Row with Accessible Label */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <label htmlFor="doctor-search-input" className="sr-only">
                  {isAr ? "ابحث باسم الاستشاري أو التخصص" : "Search by doctor name or specialty"}
                </label>
                <Search className="w-4 h-4 text-gray-400 absolute top-3.5 start-4" aria-hidden="true" />
                <input
                  id="doctor-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  aria-label={isAr ? "ابحث باسم الاستشاري أو التخصص" : "Search by doctor name or specialty"}
                  placeholder={
                    isAr
                      ? "ابحث باسم الاستشاري، التخصص، أو الكلمات المفتاحية..."
                      : "Search by doctor name, specialty, or keywords..."
                  }
                  className="w-full ps-11 pe-4 py-3 rounded-2xl bg-alabaster-base border border-alabaster-border text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    aria-label={isAr ? "مسح نص البحث" : "Clear search text"}
                    className="absolute top-3.5 end-4 text-xs text-gray-400 hover:text-gray-600 font-bold p-0.5"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                )}
              </div>

              {/* Availability Toggle with aria-pressed */}
              <button
                type="button"
                role="button"
                aria-pressed={availabilityOnly}
                aria-label={isAr ? "تصفية الأطباء المتاحين للحجز فقط" : "Filter by available consultants only"}
                onClick={handleAvailabilityToggle}
                className={`px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto border ${
                  availabilityOnly
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs"
                    : "bg-alabaster-base text-gray-700 border-alabaster-border hover:bg-gray-100"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${availabilityOnly ? "bg-emerald-600" : "bg-gray-400"}`}
                  aria-hidden="true"
                />
                <span>{isAr ? "المتاحون للحجز فقط" : "Available Only"}</span>
              </button>
            </div>

            {/* Filter Pills with ARIA grouping */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <div
                role="group"
                aria-label={isAr ? "تصفية حسب نوع الجلسة" : "Filter by session format"}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5 me-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sage-700" aria-hidden="true" />
                  <span>{isAr ? "نوع الجلسة:" : "Format:"}</span>
                </span>

                {SESSION_FORMATS.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    role="button"
                    aria-pressed={sessionFormat === fmt.id}
                    aria-label={isAr ? `تصفية: ${fmt.labelAr}` : `Filter: ${fmt.labelEn}`}
                    onClick={() => handleFormatChange(fmt.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      sessionFormat === fmt.id
                        ? "bg-teal-800 text-white shadow-xs"
                        : "bg-alabaster-base text-gray-700 hover:bg-gray-100 border border-alabaster-border"
                    }`}
                  >
                    {isAr ? fmt.labelAr : fmt.labelEn}
                  </button>
                ))}
              </div>

              {/* Specialty Select with associated label */}
              {allSpecialties.length > 0 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="specialty-filter" className="text-xs font-bold text-gray-500 shrink-0">
                    {isAr ? "التخصص:" : "Specialty:"}
                  </label>
                  <select
                    id="specialty-filter"
                    aria-label={isAr ? "اختر التخصص الطبي" : "Select clinical specialty"}
                    value={selectedSpecialty}
                    onChange={(e) => handleSpecialtyChange(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-alabaster-base text-teal-950 border border-alabaster-border focus:outline-none focus:ring-1 focus:ring-teal-700 transition max-w-[200px]"
                  >
                    <option value="ALL">{isAr ? "جميع التخصصات" : "All Specialties"}</option>
                    {allSpecialties.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Active Filter Indicators / Clear */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                <span>
                  {isAr
                    ? `عرض ${filteredDoctors.length} من أصل ${doctors.length} استشاري`
                    : `Showing ${filteredDoctors.length} of ${doctors.length} consultants`}
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  aria-label={isAr ? "إعادة ضبط جميع الفلاتر" : "Reset all filters"}
                  className="text-xs font-bold text-terracotta-700 hover:text-terracotta-800 flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>{isAr ? "إعادة ضبط الفلاتر" : "Reset Filters"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Directory Grid */}
          {filteredDoctors.length === 0 ? (
            <div className="bg-white rounded-3xl border border-alabaster-border p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-alabaster-muted flex items-center justify-center mx-auto text-gray-400">
                <Stethoscope className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-black text-teal-950">
                  {isAr ? "لا توجد نتائج مطابقة لخيارات البحث" : "No consultants match your filters"}
                </h2>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  {isAr
                    ? "جرب إزالة بعض الفلاتر أو البحث بكلمات عامة لعرض الأطباء المتاحين بالمركز."
                    : "Try resetting some filters or searching with different terms to find available consultants."}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-5 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition shadow-sm"
                >
                  {isAr ? "عرض جميع الأطباء" : "View All Doctors"}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredDoctors.map((doctor) => {
                const minPrice = getMinOfferedPrice(doctor);
                const title = isAr ? doctor.title : doctor.titleEn ?? doctor.title;
                const bio = isAr ? doctor.bio : doctor.bioEn ?? doctor.bio;
                const specialties = isAr
                  ? doctor.specialties
                  : doctor.specialtiesEn.length > 0
                  ? doctor.specialtiesEn
                  : doctor.specialties;

                return (
                  <article
                    key={doctor.id}
                    className="bg-white rounded-3xl border border-alabaster-border shadow-sm hover:shadow-md transition duration-200 p-6 flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-4">
                      {/* Doctor Header */}
                      <div className="flex items-start gap-4">
                        <ClinicalAvatar
                          src={doctor.avatarUrl ?? undefined}
                          alt={doctor.fullName}
                          name={doctor.fullName}
                          className="w-16 h-16 rounded-2xl ring-2 ring-teal-100 shrink-0"
                          isDoctor={true}
                        />

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h2 className="text-base font-black text-teal-950 leading-tight">
                              {doctor.fullName}
                            </h2>
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                                doctor.isAcceptingPatients
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  doctor.isAcceptingPatients ? "bg-emerald-500" : "bg-gray-400"
                                }`}
                                aria-hidden="true"
                              />
                              <span>
                                {doctor.isAcceptingPatients
                                  ? isAr
                                    ? "متاح للحجز"
                                    : "Available"
                                  : isAr
                                  ? "مكتمل الحجوزات"
                                  : "Busy"}
                              </span>
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-sage-800 leading-snug">
                            {title}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono" dir="ltr">
                            {doctor.licenseNumber}
                          </p>
                        </div>
                      </div>

                      {/* Specialties Pills */}
                      {specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {specialties.map((specialty) => (
                            <button
                              key={specialty}
                              type="button"
                              onClick={() => handleSpecialtyChange(specialty)}
                              aria-label={isAr ? `تصفية حسب ${specialty}` : `Filter by ${specialty}`}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                selectedSpecialty === specialty
                                  ? "bg-teal-800 text-white"
                                  : "bg-alabaster-muted text-gray-700 hover:bg-teal-50"
                              }`}
                            >
                              {specialty}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Bio */}
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                        {bio}
                      </p>

                      {/* Badges / Offering Formats */}
                      <div className="flex items-center flex-wrap gap-3 text-[11px] text-gray-600 pt-1">
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-sage-700" aria-hidden="true" />
                          <span>
                            {doctor.yearsOfExperience} {isAr ? "سنوات خبرة" : "years exp"}
                          </span>
                        </span>

                        {doctor.offersOnline && (
                          <span className="flex items-center gap-1.5 text-teal-850 font-semibold">
                            <Video className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                            <span>{isAr ? "جلسة أونلاين (زووم)" : "Online (Zoom)"}</span>
                          </span>
                        )}

                        {doctor.offersOffline && (
                          <span className="flex items-center gap-1.5 text-sage-900 font-semibold">
                            <Building2 className="w-3.5 h-3.5 text-sage-700" aria-hidden="true" />
                            <span>{isAr ? "زيارة بالعيادة" : "In-Clinic"}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Price & Booking CTA */}
                    <div className="pt-4 border-t border-alabaster-border flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-[10px] text-gray-400 font-bold">
                          {isAr ? "تبدأ الجلسة من" : "Sessions from"}
                        </span>
                        <span className="text-base font-black text-teal-900">
                          {minPrice !== null ? formatEgp(minPrice) : "—"}
                        </span>
                      </div>

                      <Link
                        href={`/booking/${doctor.id}`}
                        className="px-5 py-2.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <span>{isAr ? "احجز موعد" : "Book Slot"}</span>
                        <ArrowIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
