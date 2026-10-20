import fa, { type MessageKey } from "./messages/fa";
import en from "./messages/en";
import {
  DEFAULT_LOCALE,
  type Locale,
} from "./types";

const catalogs: Record<Locale, Record<MessageKey, string>> = { fa, en };

export type { MessageKey, Locale };
export { DEFAULT_LOCALE, isLocale, localeDir, LOCALES, LOCALE_COOKIE } from "./types";

export function t(locale: Locale, key: MessageKey, fallback?: string): string {
  return catalogs[locale]?.[key] ?? catalogs[DEFAULT_LOCALE][key] ?? fallback ?? key;
}

export function getCatalog(locale: Locale) {
  return catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
}
