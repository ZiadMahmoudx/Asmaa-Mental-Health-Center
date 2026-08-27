"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  Globe,
  User as UserIcon,
  Calendar,
  Sparkles,
  BookOpen,
  Menu,
  X,
  Stethoscope,
  ShieldCheck,
  ChevronDown,
  Activity,
  Shield,
  Users,
  Headphones,
  FileCheck2,
  Lock,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";

export const Navbar: React.FC = () => {
  const { language, toggleLanguage, t } = useLanguage();
  const { currentUser, switchUserRole } = useTelehealth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);

  // Primary Visible Nav Links
  const primaryLinks = [
    { href: "/", labelAr: "الرئيسية", labelEn: "Home" },
    { href: "/therapists", labelAr: "الأطباء والمعالجون", labelEn: "Therapists" },
    { href: "/intake", labelAr: "الاستبيان الطبي", labelEn: "Smart Triage", badge: "مجاناً" },
    { href: "/circles", labelAr: "دوائر الدعم", labelEn: "Support Circles", icon: Users },
  ];

  // Secondary Services in Clean Dropdown
  const moreServices = [
    { href: "/assessments", labelAr: "المقاييس النفسية (PHQ-9 / GAD-7)", labelEn: "Psychometric Tests", icon: Activity },
    { href: "/safety-plan", labelAr: "خطة الأمان النفسي (Stanley-Brown)", labelEn: "Psychiatric Safety Plan", icon: ShieldCheck },
    { href: "/audio", labelAr: "الصوتيات الإرشادية باللهجات", labelEn: "Dialect Audio Sessions", icon: Headphones },
    { href: "/academy", labelAr: "أكاديمية أسما والكورسات", labelEn: "Academy & Courses", icon: BookOpen },
    { href: "/books", labelAr: "مكتبة التعافي والكتب", labelEn: "Recovery E-Books", icon: BookOpen },
    { href: "/assistant", labelAr: "المرشد الذكي للإسعافات (AI PFA)", labelEn: "AI PFA Assistant", icon: Sparkles },
    { href: "/faq", labelAr: "ميثاق السرية والأسئلة الشائعة", labelEn: "Clinical Ethics & FAQ", icon: Lock },
  ];

  const allLinks = [...primaryLinks, ...moreServices];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-alabaster-border shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand Emblem */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-teal-800 flex items-center justify-center text-white shadow-md shadow-teal-900/10 group-hover:bg-teal-700 transition duration-200">
              <div className="relative flex items-center justify-center">
                <Heart className="w-6 h-6 text-sage-400 fill-sage-400/20" />
                <span className="absolute text-[10px] font-bold text-white tracking-tighter">أ</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-teal-900 text-lg md:text-xl tracking-tight leading-tight">
                {language === "ar" ? "مركز أسما" : "Asmaa Clinic"}
              </span>
              <span className="text-[11px] font-medium text-sage-600 tracking-wide">
                {language === "ar" ? "للطب النفسي وعلاج الإدمان" : "Psychiatry & Telehealth"}
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {primaryLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                    isActive
                      ? "text-teal-900 bg-teal-50 shadow-xs"
                      : "text-gray-700 hover:text-teal-900 hover:bg-alabaster-base"
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-teal-700" />}
                  <span>{language === "ar" ? link.labelAr : link.labelEn}</span>
                  {link.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-sage-100 text-sage-800 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* More Clinical Services Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 text-gray-700 hover:text-teal-900 hover:bg-alabaster-base ${
                  servicesDropdownOpen ? "bg-alabaster-base text-teal-900" : ""
                }`}
              >
                <span>{language === "ar" ? "خدمات أخرى" : "More Services"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${servicesDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {servicesDropdownOpen && (
                <div
                  className="absolute top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setServicesDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-black text-gray-400 border-b border-gray-100">
                    {language === "ar" ? "الأدوات والمصادر الإكلينيكية:" : "Clinical Tools & Resources:"}
                  </div>
                  {moreServices.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setServicesDropdownOpen(false)}
                        className="px-3 py-2 hover:bg-teal-50/70 flex items-center gap-2.5 text-xs text-gray-700 hover:text-teal-900 font-semibold transition"
                      >
                        <div className="p-1 rounded-lg bg-teal-50 text-teal-800">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span>{language === "ar" ? item.labelAr : item.labelEn}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Right Action Suite: Language, Role Switcher, Dashboard, CTA */}
          <div className="hidden md:flex items-center gap-2.5 flex-shrink-0">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-alabaster-border hover:border-sage-400 bg-white text-gray-700 text-xs font-semibold hover:text-teal-800 transition"
              title="تغيير اللغة / Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-sage-600" />
              <span>{language === "ar" ? "English" : "العربية"}</span>
            </button>

            {/* Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-alabaster-muted border border-alabaster-border text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                <span className={`w-2 h-2 rounded-full ${currentUser.role === 'DOCTOR' ? 'bg-amber-500' : currentUser.role === 'ADMIN' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                <span>
                  {currentUser.role === "DOCTOR"
                    ? language === "ar" ? "وضع الطبيب" : "Doctor"
                    : currentUser.role === "ADMIN"
                    ? language === "ar" ? "وضع الإدارة" : "Admin"
                    : language === "ar" ? "وضع المريض" : "Patient"}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 border-b border-gray-100">
                    {language === "ar" ? "تبديل وضع العرض (تجربة المنصة):" : "Preview Role View:"}
                  </div>
                  <button
                    onClick={() => {
                      switchUserRole("PATIENT");
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-start rtl:text-right ltr:text-left px-3 py-2 hover:bg-teal-50 flex items-center gap-2 font-medium ${
                      currentUser.role === "PATIENT" ? "text-teal-800 bg-teal-50/60 font-bold" : "text-gray-700"
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5 text-sage-600" />
                    <span>{language === "ar" ? "المريض (سارة محمود)" : "Patient (Sara)"}</span>
                  </button>
                  <button
                    onClick={() => {
                      switchUserRole("DOCTOR");
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-start rtl:text-right ltr:text-left px-3 py-2 hover:bg-teal-50 flex items-center gap-2 font-medium ${
                      currentUser.role === "DOCTOR" ? "text-teal-800 bg-teal-50/60 font-bold" : "text-gray-700"
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-amber-600" />
                    <span>{language === "ar" ? "الاستشاري (د. أسماء)" : "Doctor (Dr. Asmaa)"}</span>
                  </button>
                  <button
                    onClick={() => {
                      switchUserRole("ADMIN");
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-start rtl:text-right ltr:text-left px-3 py-2 hover:bg-teal-50 flex items-center gap-2 font-medium ${
                      currentUser.role === "ADMIN" ? "text-teal-800 bg-teal-50/60 font-bold" : "text-gray-700"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    <span>{language === "ar" ? "لوحة الإدارة الطبية" : "Admin QA Board"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Dashboard Link */}
            <Link
              href={
                currentUser.role === "DOCTOR"
                  ? "/dashboard/doctor"
                  : currentUser.role === "ADMIN"
                  ? "/dashboard/admin"
                  : "/dashboard/patient"
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-900 bg-sage-50 border border-sage-200/60 hover:bg-sage-100 transition"
            >
              <UserIcon className="w-3.5 h-3.5 text-teal-800" />
              <span>
                {currentUser.role === "DOCTOR"
                  ? (language === "ar" ? "لوحة الاستشاري" : "Doctor")
                  : currentUser.role === "ADMIN"
                  ? (language === "ar" ? "لوحة الإدارة" : "Admin")
                  : (language === "ar" ? "بوابة المريض" : "Patient")}
              </span>
            </Link>

            {/* Primary Instant Booking Button */}
            <Link
              href="/therapists"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-terracotta-600 hover:bg-terracotta-700 shadow-md shadow-terracotta-600/20 transition transform hover:-translate-y-0.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "احجز جلستك" : "Book Session"}</span>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-700"
            >
              {language === "ar" ? "EN" : "عربي"}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-6 space-y-3 shadow-xl max-h-[80vh] overflow-y-auto">
          <div className="space-y-1">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-teal-50 hover:text-teal-900"
              >
                {language === "ar" ? link.labelAr : link.labelEn}
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-2">
            <Link
              href={
                currentUser.role === "DOCTOR"
                  ? "/dashboard/doctor"
                  : currentUser.role === "ADMIN"
                  ? "/dashboard/admin"
                  : "/dashboard/patient"
              }
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-sage-50 text-teal-900"
            >
              <UserIcon className="w-4 h-4" />
              <span>{currentUser.role === "DOCTOR" ? "لوحة الاستشاري" : currentUser.role === "ADMIN" ? "لوحة الإدارة" : "بوابة المريض"}</span>
            </Link>

            <Link
              href="/therapists"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-terracotta-600 hover:bg-terracotta-700 shadow-md"
            >
              <Calendar className="w-4 h-4" />
              <span>{language === "ar" ? "احجز جلستك الآن" : "Book Session"}</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
