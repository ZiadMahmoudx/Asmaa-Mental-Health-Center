"use client";

import React, { createContext, useContext, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export type Language = "ar" | "en";
export type Direction = "rtl" | "ltr";

interface LanguageContextType {
  language: Language;
  direction: Direction;
  isAr: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const COOKIE_NAME = "asmaa_lang";

function writeLanguageCookie(lang: Language) {
  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

interface ProviderProps {
  children: React.ReactNode;
  initialLanguage?: Language;
}

export const LanguageProvider: React.FC<ProviderProps> = ({
  children,
  initialLanguage = "ar",
}) => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    // Cookie is the single source of truth (resolved on server into initialLanguage).
    // Sync document attributes and update client localStorage cache.
    writeLanguageCookie(language);
    try {
      localStorage.setItem(COOKIE_NAME, language);
    } catch {
      // Ignore storage errors in private browsing
    }
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    writeLanguageCookie(lang);
    try {
      localStorage.setItem(COOKIE_NAME, lang);
    } catch {
      // Ignore storage errors in private browsing
    }
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;

    // Refresh active server components to reflect language change
    startTransition(() => {
      router.refresh();
    });
  };

  const toggleLanguage = () => {
    const nextLang = language === "ar" ? "en" : "ar";
    setLanguage(nextLang);
  };

  const isAr = language === "ar";
  const direction: Direction = isAr ? "rtl" : "ltr";

  // Simple key resolver
  const t = (key: string): string => key;

  return (
    <LanguageContext.Provider
      value={{ language, direction, isAr, setLanguage, toggleLanguage, t }}
    >
      <div
        dir={direction}
        className={`min-h-screen ${isAr ? "font-cairo" : "font-inter"}`}
      >
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
