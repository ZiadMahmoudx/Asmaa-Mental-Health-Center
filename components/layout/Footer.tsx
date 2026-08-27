"use client";

import React from "react";
import Link from "next/link";
import { Heart, ShieldCheck, Lock, Award, MapPin, Phone, Mail, PhoneCall } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export const Footer: React.FC = () => {
  const { language } = useLanguage();

  return (
    <footer className="bg-teal-900 text-white pt-16 pb-12 border-t border-teal-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-teal-800/80">
          {/* Brand & Mission Statement */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sage-600 flex items-center justify-center text-white shadow-md">
                <Heart className="w-5 h-5 text-white fill-white/20" />
              </div>
              <div>
                <span className="font-extrabold text-white text-lg tracking-tight">
                  {language === "ar" ? "مركز أسما للصحة النفسية" : "Asmaa Mental Health Center"}
                </span>
                <p className="text-xs text-sage-300">
                  {language === "ar" ? "رعاية نفسية متخصصة وسرية تامة" : "Specialized Psychiatric & Psychotherapy Care"}
                </p>
              </div>
            </div>

            <p className="text-sm text-teal-100/80 leading-relaxed max-w-sm">
              {language === "ar"
                ? "منظومة طبية نفسية متكاملة تقدم أحدث بروتوكولات التشخيص والعلاج النفسي والدوائي عن بُعد، بإشراف نخبة من أساتذة واستشاريي الطب النفسي المعتمدين دولياً."
                : "An integrated telepsychiatry and psychotherapy platform delivering evidence-based clinical protocols supervised by board-certified consultant psychiatrists."}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-850 border border-teal-700/60 text-xs text-sage-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-sage-400" />
                <span>HIPAA / GDPR Ready</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-850 border border-teal-700/60 text-xs text-sage-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-sage-400" />
                <span>AES-256 E2EE Video</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-sage-300 uppercase tracking-wider">
              {language === "ar" ? "الخدمات والعيادات" : "Clinical Services"}
            </h4>
            <ul className="space-y-2 text-sm text-teal-100/70">
              <li>
                <Link href="/therapists" className="hover:text-white transition">
                  {language === "ar" ? "استشارات الطب النفسي" : "Psychiatric Consultations"}
                </Link>
              </li>
              <li>
                <Link href="/therapists" className="hover:text-white transition">
                  {language === "ar" ? "العلاج المعرفي السلوكي (CBT)" : "Cognitive Behavioral Therapy"}
                </Link>
              </li>
              <li>
                <Link href="/therapists" className="hover:text-white transition">
                  {language === "ar" ? "علاج الصدمات والـ EMDR" : "Trauma Recovery & EMDR"}
                </Link>
              </li>
              <li>
                <Link href="/therapists" className="hover:text-white transition">
                  {language === "ar" ? "الاستشارات الزوجية والأسرية" : "Couples & Family Therapy"}
                </Link>
              </li>
              <li>
                <Link href="/intake" className="hover:text-white transition">
                  {language === "ar" ? "الاستبيان الطبي الذكي" : "Smart Clinical Triage"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Academy & Resources */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-sage-300 uppercase tracking-wider">
              {language === "ar" ? "الأكاديمية والمكتبة" : "Academy & Books"}
            </h4>
            <ul className="space-y-2 text-sm text-teal-100/70">
              <li>
                <Link href="/academy" className="hover:text-white transition">
                  {language === "ar" ? "ماستركلاس نوبات الهلع" : "Panic Disorder Masterclass"}
                </Link>
              </li>
              <li>
                <Link href="/academy" className="hover:text-white transition">
                  {language === "ar" ? "كورس التعافي من الصدمات" : "Trauma Recovery Course"}
                </Link>
              </li>
              <li>
                <Link href="/books" className="hover:text-white transition">
                  {language === "ar" ? "كتب المساعدة الذاتية" : "Self-Help eBooks"}
                </Link>
              </li>
              <li>
                <Link href="/assistant" className="hover:text-white transition">
                  {language === "ar" ? "المساعد النفسي الذكي (PFA)" : "AI Triage Assistant"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Clinic Locations */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-sage-300 uppercase tracking-wider">
              {language === "ar" ? "الفروع والتواصل" : "Contact & Branches"}
            </h4>
            <ul className="space-y-2.5 text-xs text-teal-100/80">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-terracotta-400 flex-shrink-0 mt-0.5" />
                <span>
                  {language === "ar"
                    ? "القاهرة الجديدة: التجمع الخامس، شارع التسعين الشمالي، مجمع الميديكال سنتر"
                    : "New Cairo: North 90th St, Medical Center Complex"}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-sage-400 flex-shrink-0" />
                <span dir="ltr">+20 2 2849 0192 / +20 100 234 5678</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sage-400 flex-shrink-0" />
                <span>care@asmaaclinic.com</span>
              </li>
              <li className="pt-2">
                <div className="p-2.5 bg-red-900/50 rounded-xl border border-red-800 text-[11px] text-red-200 flex items-center gap-2">
                  <PhoneCall className="w-3.5 h-3.5 text-red-400" />
                  <span>طوارئ الصحة النفسية (مصر): 16328</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Accreditations */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-teal-200/60">
          <p>
            © {new Date().getFullYear()} {language === "ar" ? "مركز أسما للصحة النفسية. جميع الحقوق محفوظة." : "Asmaa Mental Health Center. All rights reserved."}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/faq" className="hover:text-white transition">
              {language === "ar" ? "سياسة الخصوصية والسرية الطبية (HIPAA)" : "Privacy & Confidentiality"}
            </Link>
            <span>•</span>
            <Link href="/faq" className="hover:text-white transition">
              {language === "ar" ? "الأسئلة الشائعة" : "FAQ"}
            </Link>
            <span>•</span>
            <Link href="/faq" className="hover:text-white transition">
              {language === "ar" ? "ميثاق الشرف الأخلاقي للأطباء" : "Clinical Code of Ethics"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
