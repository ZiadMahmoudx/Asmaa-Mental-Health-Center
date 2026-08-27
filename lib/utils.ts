import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CurrencyCode } from "@/types/telehealth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fixed baseline conversions for clinical billing demonstration
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  EGP: 1,
  USD: 0.02, // 1 EGP = 0.02 USD (50 EGP = $1)
  SAR: 0.075, // 1 EGP = 0.075 SAR (13.33 EGP = 1 SAR)
  AED: 0.0735, // 1 EGP = 0.0735 AED (13.61 EGP = 1 AED)
};

export function convertFromEGP(amountInEGP: number, targetCurrency: CurrencyCode): number {
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  const converted = amountInEGP * rate;
  return targetCurrency === 'EGP' ? Math.round(converted) : Math.round(converted * 10) / 10;
}

export function formatCurrency(
  amountInEGP: number,
  currency: CurrencyCode = "EGP",
  lang: "ar" | "en" = "ar"
): string {
  const converted = convertFromEGP(amountInEGP, currency);

  const symbolsAr: Record<CurrencyCode, string> = {
    EGP: "ج.م",
    USD: "$",
    SAR: "ر.س",
    AED: "د.إ",
  };

  const symbolsEn: Record<CurrencyCode, string> = {
    EGP: "EGP",
    USD: "USD",
    SAR: "SAR",
    AED: "AED",
  };

  if (lang === "ar") {
    return `${converted.toLocaleString("ar-EG")} ${symbolsAr[currency]}`;
  }
  return `${symbolsEn[currency]} ${converted.toLocaleString("en-US")}`;
}

export function formatDateTime(
  isoString: string,
  lang: "ar" | "en" = "ar",
  timezone: string = "Africa/Cairo"
): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return isoString;
  }
}
