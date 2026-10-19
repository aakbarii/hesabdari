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
  ACCENT_COLORS,
  APPEARANCE_MOODS,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_APPEARANCE_MOOD,
  accentToCssVars,
  filterMobilePrimary,
  filterNavGroups,
  getAccentHex,
  getDefaultVisibleNav,
  type AccentColorId,
  type AppearanceMood,
} from "@/lib/appearance";
type AppearanceContextValue = {
  mood: AppearanceMood;
  accent: AccentColorId;
  visibleNav: string[];
  loaded: boolean;
  navGroups: ReturnType<typeof filterNavGroups>;
  mobilePrimary: ReturnType<typeof filterMobilePrimary>;
  setMood: (mood: AppearanceMood) => Promise<void>;
  setAccent: (accent: AccentColorId) => Promise<void>;
  setVisibleNav: (hrefs: string[]) => Promise<void>;
  isNavVisible: (href: string) => boolean;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyDomAppearance(mood: AppearanceMood, accent: AccentColorId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.appearance = mood;
  const vars = accentToCssVars(getAccentHex(accent));
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ].includes(pathname);

  const [mood, setMoodState] = useState<AppearanceMood>(DEFAULT_APPEARANCE_MOOD);
  const [accent, setAccentState] = useState<AccentColorId>(DEFAULT_ACCENT_COLOR);
  const [visibleNav, setVisibleNavState] = useState<string[]>(getDefaultVisibleNav());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    applyDomAppearance(mood, accent);
  }, [mood, accent]);

  useEffect(() => {
    if (isAuthPage) {
      setLoaded(true);
      return;
    }
    const controller = new AbortController();
    fetch("/api/settings", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("settings failed");
        return r.json();
      })
      .then((data) => {
        const nextMood =
          data.appearanceMood in APPEARANCE_MOODS
            ? (data.appearanceMood as AppearanceMood)
            : DEFAULT_APPEARANCE_MOOD;
        const nextAccent = ACCENT_COLORS.some((c) => c.id === data.accentColor)
          ? (data.accentColor as AccentColorId)
          : DEFAULT_ACCENT_COLOR;
        const nextNav = Array.isArray(data.visibleNav)
          ? (data.visibleNav as string[])
          : getDefaultVisibleNav();
        setMoodState(nextMood);
        setAccentState(nextAccent);
        setVisibleNavState(nextNav);
        applyDomAppearance(nextMood, nextAccent);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, [isAuthPage]);

  const patch = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("failed");
    return res.json();
  }, []);

  const setMood = useCallback(
    async (next: AppearanceMood) => {
      setMoodState(next);
      applyDomAppearance(next, accent);
      const data = await patch({ appearanceMood: next });
      if (data.appearanceMood) setMoodState(data.appearanceMood);
    },
    [accent, patch]
  );

  const setAccent = useCallback(
    async (next: AccentColorId) => {
      setAccentState(next);
      applyDomAppearance(mood, next);
      const data = await patch({ accentColor: next });
      if (data.accentColor) setAccentState(data.accentColor);
    },
    [mood, patch]
  );

  const setVisibleNav = useCallback(
    async (hrefs: string[]) => {
      setVisibleNavState(hrefs);
      const data = await patch({ visibleNav: hrefs });
      if (Array.isArray(data.visibleNav)) setVisibleNavState(data.visibleNav);
    },
    [patch]
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({
      mood,
      accent,
      visibleNav,
      loaded,
      navGroups: filterNavGroups(visibleNav),
      mobilePrimary: filterMobilePrimary(visibleNav),
      setMood,
      setAccent,
      setVisibleNav,
      isNavVisible: (href: string) => visibleNav.includes(href),
    }),
    [mood, accent, visibleNav, loaded, setMood, setAccent, setVisibleNav]
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    const visibleNav = getDefaultVisibleNav();
    return {
      mood: DEFAULT_APPEARANCE_MOOD,
      accent: DEFAULT_ACCENT_COLOR,
      visibleNav,
      loaded: true,
      navGroups: filterNavGroups(visibleNav),
      mobilePrimary: filterMobilePrimary(visibleNav),
      setMood: async () => {},
      setAccent: async () => {},
      setVisibleNav: async () => {},
      isNavVisible: () => true,
    } satisfies AppearanceContextValue;
  }
  return ctx;
}
