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
  filterNavForGender,
  filterNavGroups,
  getAccentHex,
  getDefaultVisibleNav,
  isGender,
  normalizeMobileNav,
  normalizeVisibleNav,
  type AccentColorId,
  type AppearanceMood,
  type Gender,
} from "@/lib/appearance";

type AppearanceContextValue = {
  mood: AppearanceMood;
  accent: AccentColorId;
  visibleNav: string[];
  mobileNav: string[];
  gender: Gender | null;
  loaded: boolean;
  navGroups: ReturnType<typeof filterNavGroups>;
  mobilePrimary: ReturnType<typeof filterMobilePrimary>;
  setMood: (mood: AppearanceMood) => Promise<void>;
  setAccent: (accent: AccentColorId) => Promise<void>;
  setVisibleNav: (hrefs: string[]) => Promise<void>;
  setMobileNav: (hrefs: string[]) => Promise<void>;
  setGender: (gender: Gender) => Promise<void>;
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
  const [mobileNav, setMobileNavState] = useState<string[]>(
    normalizeMobileNav(null, getDefaultVisibleNav())
  );
  const [gender, setGenderState] = useState<Gender | null>(null);
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
        const nextGender = isGender(data.gender) ? data.gender : null;
        const nextNav = filterNavForGender(
          normalizeVisibleNav(
            Array.isArray(data.visibleNav)
              ? data.visibleNav
              : getDefaultVisibleNav()
          ),
          nextGender
        );
        const nextMobile = normalizeMobileNav(data.mobileNav, nextNav);
        setMoodState(nextMood);
        setAccentState(nextAccent);
        setGenderState(nextGender);
        setVisibleNavState(nextNav);
        setMobileNavState(nextMobile);
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
      const filtered = filterNavForGender(normalizeVisibleNav(hrefs), gender);
      setVisibleNavState(filtered);
      setMobileNavState((prev) => normalizeMobileNav(prev, filtered));
      const data = await patch({ visibleNav: filtered });
      if (Array.isArray(data.visibleNav)) setVisibleNavState(data.visibleNav);
      if (Array.isArray(data.mobileNav)) setMobileNavState(data.mobileNav);
    },
    [patch, gender]
  );

  const setMobileNav = useCallback(
    async (hrefs: string[]) => {
      const next = normalizeMobileNav(hrefs, visibleNav);
      setMobileNavState(next);
      const data = await patch({ mobileNav: next });
      if (Array.isArray(data.mobileNav)) setMobileNavState(data.mobileNav);
    },
    [patch, visibleNav]
  );

  const setGender = useCallback(
    async (next: Gender) => {
      setGenderState(next);
      const data = await patch({ gender: next });
      if (isGender(data.gender)) setGenderState(data.gender);
      if (Array.isArray(data.visibleNav)) setVisibleNavState(data.visibleNav);
      if (Array.isArray(data.mobileNav)) setMobileNavState(data.mobileNav);
      if (data.appearanceMood in APPEARANCE_MOODS) {
        setMoodState(data.appearanceMood as AppearanceMood);
        applyDomAppearance(data.appearanceMood as AppearanceMood, accent);
      }
    },
    [patch, accent]
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({
      mood,
      accent,
      visibleNav,
      mobileNav,
      gender,
      loaded,
      navGroups: filterNavGroups(visibleNav),
      mobilePrimary: filterMobilePrimary(visibleNav, mobileNav),
      setMood,
      setAccent,
      setVisibleNav,
      setMobileNav,
      setGender,
      isNavVisible: (href: string) => visibleNav.includes(href),
    }),
    [
      mood,
      accent,
      visibleNav,
      mobileNav,
      gender,
      loaded,
      setMood,
      setAccent,
      setVisibleNav,
      setMobileNav,
      setGender,
    ]
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
    const mobileNav = normalizeMobileNav(null, visibleNav);
    return {
      mood: DEFAULT_APPEARANCE_MOOD,
      accent: DEFAULT_ACCENT_COLOR,
      visibleNav,
      mobileNav,
      gender: null,
      loaded: true,
      navGroups: filterNavGroups(visibleNav),
      mobilePrimary: filterMobilePrimary(visibleNav, mobileNav),
      setMood: async () => {},
      setAccent: async () => {},
      setVisibleNav: async () => {},
      setMobileNav: async () => {},
      setGender: async () => {},
      isNavVisible: () => true,
    } satisfies AppearanceContextValue;
  }
  return ctx;
}
