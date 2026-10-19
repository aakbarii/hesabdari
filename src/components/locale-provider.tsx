"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localeDir,
  t as translate,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  loaded: boolean;
  t: (key: MessageKey, fallback?: string) => string;
  setLocale: (locale: Locale) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  const value = match?.split("=")[1];
  return isLocale(value) ? value : null;
}

function writeCookieLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
}

function applyDomLocale(locale: Locale) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = localeDir(locale);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ].includes(pathname);

  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fromCookie = readCookieLocale();
    if (fromCookie) {
      setLocaleState(fromCookie);
      applyDomLocale(fromCookie);
    }
  }, []);

  useEffect(() => {
    applyDomLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (isAuthPage) {
      setLoaded(true);
      return;
    }
    const controller = new AbortController();
    fetch("/api/settings", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("settings");
        return r.json();
      })
      .then((data) => {
        if (isLocale(data.locale)) {
          setLocaleState(data.locale);
          writeCookieLocale(data.locale);
          applyDomLocale(data.locale);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, [isAuthPage]);

  const setLocale = useCallback(async (next: Locale) => {
    setLocaleState(next);
    writeCookieLocale(next);
    applyDomLocale(next);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      /* local still applied */
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: localeDir(locale),
      loaded,
      t: (key, fallback) => translate(locale, key, fallback),
      setLocale,
    }),
    [locale, loaded, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      dir: localeDir(DEFAULT_LOCALE),
      loaded: true,
      t: (key: MessageKey, fallback?: string) =>
        translate(DEFAULT_LOCALE, key, fallback),
      setLocale: async () => {},
    } satisfies LocaleContextValue;
  }
  return ctx;
}
