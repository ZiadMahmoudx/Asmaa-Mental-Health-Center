"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "ar" | "en";
type Direction = "rtl" | "ltr";

interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const translations: Translations = {
  brandName: {
    ar: "مركز أسما للصحة النفسية",
    en: "Asmaa Mental Health Center",
  },
  brandTagline: {
    ar: "مساحتك الآمنة للتعافي النفسي والرعاية المتخصصة",
    en: "Your safe space for psychiatric care & emotional healing",
  },
  navAbout: {
    ar: "عن المركز",
    en: "About Us",
  },
  navDoctors: {
    ar: "الأطباء والمعالجون",
    en: "Therapists",
  },
  navAcademy: {
    ar: "الأكاديمية والكتب",
    en: "Academy & Books",
  },
  navIntake: {
    ar: "الاستبيان الطبي الذكي",
    en: "Smart Triage",
  },
  navEmergency: {
    ar: "طوارئ الصحة النفسية",
    en: "Emergency Hotline",
  },
  bookNow: {
    ar: "احجز جلسة فورية",
    en: "Book a Session",
  },
  loginPortal: {
    ar: "تسجيل الدخول",
    en: "Portal Login",
  },
  patientPortal: {
    ar: "بوابة المريض",
    en: "Patient Portal",
  },
  doctorPortal: {
    ar: "بوابة الاستشاري",
    en: "Doctor Portal",
  },
  startIntakeFree: {
    ar: "ابدأ تقييم حالتك النفسية مجاناً (3 دقائق)",
    en: "Start Free 3-Min Assessment",
  },
  hipaaBadge: {
    ar: "سرية تامة 100% متوافقة مع معايير HIPAA",
    en: "100% HIPAA-Compliant Privacy",
  },
  e2eBadge: {
    ar: "جلسات فيديو مشفرة من طرف إلى طرف (E2EE)",
    en: "End-to-End Encrypted Video",
  },
  licensedBadge: {
    ar: "نخبة من استشاريي البورد المصري والبريطاني",
    en: "Licensed Egyptian & Royal Board Psychiatrists",
  },
  switchRole: {
    ar: "تبديل وضع العرض (تجربة المنصة)",
    en: "Switch View Role",
  },
  walletBalance: {
    ar: "رصيد المحفظة",
    en: "Wallet Balance",
  },
  joinSession: {
    ar: "انضمام للجلسة الآن",
    en: "Join Session Now",
  },
  crisisAlertHeader: {
    ar: "تنبيه طوارئ الصحة النفسية",
    en: "Mental Health Emergency Alert",
  },
  crisisCallButton: {
    ar: "اتصل بالخط الساخن للأمانة العامة (16328)",
    en: "Call National Mental Health Line (16328)",
  },
};

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("ar");

  useEffect(() => {
    const saved = localStorage.getItem("asmaa_lang") as Language;
    if (saved && (saved === "ar" || saved === "en")) {
      setLanguageState(saved);
      document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = saved;
    } else {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("asmaa_lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  const toggleLanguage = () => {
    const nextLang = language === "ar" ? "en" : "ar";
    setLanguage(nextLang);
  };

  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][language];
    }
    return key;
  };

  const direction: Direction = language === "ar" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, toggleLanguage, t }}>
      <div dir={direction} className={`min-h-screen ${language === 'ar' ? 'font-cairo' : 'font-inter'}`}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
