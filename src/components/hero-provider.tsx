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
  PAGE_HEROES,
  parsePageHeroPrefs,
  resolveHeroSrc,
  type PageHeroKey,
  type PageHeroPrefs,
} from "@/lib/page-heroes";

type Resolved = ReturnType<typeof resolveHeroSrc>;

type HeroContextValue = {
  prefs: PageHeroPrefs;
  loaded: boolean;
  resolve: (key: PageHeroKey) => Resolved;
  hide: (key: PageHeroKey) => Promise<void>;
  show: (key: PageHeroKey) => Promise<void>;
  reset: (key: PageHeroKey) => Promise<void>;
  upload: (key: PageHeroKey, file: File) => Promise<void>;
  reload: () => Promise<void>;
};

const HeroContext = createContext<HeroContextValue | null>(null);

export function HeroProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ].includes(pathname);

  const [prefs, setPrefs] = useState<PageHeroPrefs>({});
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/heroes");
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      setPrefs(parsePageHeroPrefs(data.prefs));
    } catch {
      setPrefs({});
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthPage) {
      setLoaded(true);
      return;
    }
    reload();
  }, [isAuthPage, reload]);

  const hide = useCallback(async (key: PageHeroKey) => {
    const res = await fetch("/api/heroes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, action: "hide" }),
    });
    if (!res.ok) throw new Error("fail");
    const data = await res.json();
    setPrefs(parsePageHeroPrefs(data.prefs));
  }, []);

  const show = useCallback(async (key: PageHeroKey) => {
    const res = await fetch("/api/heroes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, action: "show" }),
    });
    if (!res.ok) throw new Error("fail");
    const data = await res.json();
    setPrefs(parsePageHeroPrefs(data.prefs));
  }, []);

  const reset = useCallback(async (key: PageHeroKey) => {
    const res = await fetch("/api/heroes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, action: "reset" }),
    });
    if (!res.ok) throw new Error("fail");
    const data = await res.json();
    setPrefs(parsePageHeroPrefs(data.prefs));
  }, []);

  const upload = useCallback(async (key: PageHeroKey, file: File) => {
    const fd = new FormData();
    fd.set("key", key);
    fd.set("file", file);
    const res = await fetch("/api/heroes", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "fail");
    }
    const data = await res.json();
    setPrefs(parsePageHeroPrefs(data.prefs));
  }, []);

  const value = useMemo<HeroContextValue>(
    () => ({
      prefs,
      loaded,
      resolve: (key) => resolveHeroSrc(key, prefs),
      hide,
      show,
      reset,
      upload,
      reload,
    }),
    [prefs, loaded, hide, show, reset, upload, reload]
  );

  return <HeroContext.Provider value={value}>{children}</HeroContext.Provider>;
}

export function useHeroes() {
  const ctx = useContext(HeroContext);
  if (!ctx) {
    return {
      prefs: {},
      loaded: true,
      resolve: (key: PageHeroKey) => resolveHeroSrc(key, {}),
      hide: async () => {},
      show: async () => {},
      reset: async () => {},
      upload: async () => {},
      reload: async () => {},
    } satisfies HeroContextValue;
  }
  return ctx;
}

export function useHeroSrc(key: PageHeroKey) {
  const { resolve, loaded } = useHeroes();
  const resolved = resolve(key);
  return { ...resolved, loaded, defaultSrc: PAGE_HEROES[key] };
}
