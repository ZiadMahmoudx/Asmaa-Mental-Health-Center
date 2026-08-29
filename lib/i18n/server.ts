import { cookies } from "next/headers";

export type Language = "ar" | "en";
export type Direction = "rtl" | "ltr";

export const LANGUAGE_COOKIE_NAME = "asmaa_lang";

/**
 * Reads the visitor's language preference on the server via cookies.
 * Defaults strictly to Arabic ("ar").
 */
export async function getLanguage(): Promise<Language> {
  try {
    const cookieStore = await cookies();
    const lang = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
    if (lang === "en") return "en";
    return "ar";
  } catch {
    return "ar";
  }
}

/**
 * Returns the layout direction for a given language.
 */
export function getDirection(lang: Language): Direction {
  return lang === "ar" ? "rtl" : "ltr";
}
