export type Locale = "fa" | "en";

export const LOCALES: Locale[] = ["fa", "en"];
export const DEFAULT_LOCALE: Locale = "fa";
export const LOCALE_COOKIE = "ravaal-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "fa" || value === "en";
}

export function localeDir(locale: Locale): "rtl" | "ltr" {
  return locale === "fa" ? "rtl" : "ltr";
}
