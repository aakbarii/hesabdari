import { NAV_GROUPS, NAV_ITEMS } from "@/lib/constants";

export const APPEARANCE_MOODS = {
  joojo: {
    label: "جوجو مود",
    labelEn: "JooJoo",
    description: "صورتی ملایم، کارت‌های خلوت و جوجوی صورتی",
    descriptionEn: "A pink-bow world of chicks, stickers and pastel notebooks",
  },
  neutral: {
    label: "خنثی",
    labelEn: "Neutral",
    description: "سبز آرامش‌بخش",
    descriptionEn: "Calm emerald",
  },
  feminine: {
    label: "دخترانه",
    labelEn: "Feminine",
    description: "صورتی ملایم و سطوح نرم",
    descriptionEn: "Soft rose tones and rounded surfaces",
  },
  masculine: {
    label: "پسرانه",
    labelEn: "Masculine",
    description: "سرد و محکم با ته‌رنگ سربی",
    descriptionEn: "Cool slate with firmer edges",
  },
  ocean: {
    label: "اقیانوس",
    labelEn: "Ocean",
    description: "آبی عمیق و حس ساحل",
    descriptionEn: "Deep blues with a coastal feel",
  },
  sunset: {
    label: "غروب",
    labelEn: "Sunset",
    description: "نارنجی گرم و طلایی",
    descriptionEn: "Warm orange and golden light",
  },
  forest: {
    label: "جنگل",
    labelEn: "Forest",
    description: "سبز تیره و طبیعی",
    descriptionEn: "Deep natural greens",
  },
  minimal: {
    label: "مینیمال",
    labelEn: "Minimal",
    description: "خاکستری روشن و خلوت",
    descriptionEn: "Light gray and quiet",
  },
  cozy: {
    label: "دنج",
    labelEn: "Cozy",
    description: "کرم گرم و نرم",
    descriptionEn: "Warm cream and soft ambience",
  },
} as const;

export type AppearanceMood = keyof typeof APPEARANCE_MOODS;

export const ACCENT_COLORS = [
  { id: "emerald", label: "زمردی", labelEn: "Emerald", hex: "#10b981" },
  { id: "teal", label: "فیروزه‌ای", labelEn: "Teal", hex: "#14b8a6" },
  { id: "sky", label: "آبی آسمانی", labelEn: "Sky", hex: "#0ea5e9" },
  { id: "indigo", label: "نیلی", labelEn: "Indigo", hex: "#6366f1" },
  { id: "rose", label: "رز", labelEn: "Rose", hex: "#f43f5e" },
  { id: "fuchsia", label: "سرخابی", labelEn: "Fuchsia", hex: "#d946ef" },
  { id: "amber", label: "کهربایی", labelEn: "Amber", hex: "#f59e0b" },
  { id: "orange", label: "نارنجی", labelEn: "Orange", hex: "#f97316" },
  { id: "slate", label: "سربی", labelEn: "Slate", hex: "#64748b" },
] as const;

export type AccentColorId = (typeof ACCENT_COLORS)[number]["id"];

export const DEFAULT_APPEARANCE_MOOD: AppearanceMood = "joojo";
export const DEFAULT_ACCENT_COLOR: AccentColorId = "rose";

/** Routes that cannot be hidden from navigation */
export const LOCKED_NAV_HREFS = ["/", "/settings"] as const;

/** Hidden for male profiles (period / cycle tracking) */
export const FEMALE_ONLY_NAV_HREFS = ["/cycle"] as const;

export type Gender = "male" | "female";

export function isGender(value: unknown): value is Gender {
  return value === "male" || value === "female";
}

export function filterNavForGender(
  hrefs: string[],
  gender: Gender | null | undefined
): string[] {
  if (gender !== "male") return hrefs;
  const blocked = new Set<string>(FEMALE_ONLY_NAV_HREFS);
  return hrefs.filter((h) => !blocked.has(h));
}

export type NavHref = (typeof NAV_ITEMS)[number]["href"];

export const DEFAULT_HIDDEN_NAV_HREFS = ["/nutrition", "/fitness"] as const;

export function getAllNavHrefs(): string[] {
  return NAV_ITEMS.map((item) => item.href);
}

export function getDefaultVisibleNav(): string[] {
  const hidden = new Set<string>(DEFAULT_HIDDEN_NAV_HREFS);
  return getAllNavHrefs().filter((h) => !hidden.has(h));
}

export function isAppearanceMood(value: unknown): value is AppearanceMood {
  return typeof value === "string" && value in APPEARANCE_MOODS;
}

export function isAccentColorId(value: unknown): value is AccentColorId {
  return (
    typeof value === "string" &&
    ACCENT_COLORS.some((c) => c.id === value)
  );
}

export function getAccentHex(id: AccentColorId): string {
  return ACCENT_COLORS.find((c) => c.id === id)?.hex ?? "#10b981";
}

/** Convert #RRGGBB to approximate oklch primary string for CSS variables */
export function accentToCssVars(hex: string): Record<string, string> {
  const { l, c, h } = hexToOklch(hex);
  const primary = `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
  const ring = `oklch(${Math.min(0.78, l + 0.12).toFixed(3)} ${(c * 0.55).toFixed(3)} ${h.toFixed(1)})`;
  const sidebarPrimary = primary;
  return {
    "--primary": primary,
    "--ring": ring,
    "--sidebar-primary": sidebarPrimary,
    "--accent-swatch": hex,
  };
}

function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const lin = (v: number) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const rl = lin(r);
  const gl = lin(g);
  const bl = lin(b);

  const l_ = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m_ = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s_ = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const b2 = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const C = Math.sqrt(a * a + b2 * b2);
  let H = (Math.atan2(b2, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return { l: L, c: C, h: H };
}

export function normalizeVisibleNav(raw: unknown): string[] {
  const allSet = new Set(getAllNavHrefs());
  const locked = LOCKED_NAV_HREFS as readonly string[];
  let list: string[];
  if (Array.isArray(raw)) {
    const isLegacy = raw.some(
      (h) => typeof h === "string" && ["/insights", "/bank-inbox", "/focus", "/travel", "/habits"].includes(h)
    );
    const seen = new Set<string>();
    list = [];
    for (const h of raw) {
      if (typeof h === "string" && allSet.has(h) && !seen.has(h)) {
        if (isLegacy && (DEFAULT_HIDDEN_NAV_HREFS as readonly string[]).includes(h)) {
          continue;
        }
        list.push(h);
        seen.add(h);
      }
    }
  } else {
    list = getDefaultVisibleNav();
  }
  for (const href of locked) {
    if (!list.includes(href)) list.unshift(href);
  }
  return list;
}

/** Reorder `list` by moving index `from` to `to` */
export function moveNavItem(list: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function filterNavGroups(visible: string[]) {
  const order = new Map(visible.map((h, i) => [h, i]));
  const set = new Set(visible);
  const groupOrder = new Map(NAV_GROUPS.map((g, i) => [g.titleKey, i]));

  return NAV_GROUPS.map((group) => ({
    ...group,
    items: [...group.items]
      .filter((item) => set.has(item.href))
      .sort(
        (a, b) => (order.get(a.href) ?? 999) - (order.get(b.href) ?? 999)
      ),
  }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => (groupOrder.get(a.titleKey) ?? 0) - (groupOrder.get(b.titleKey) ?? 0));
}

const DEFAULT_MOBILE_NAV = [
  "/",
  "/transactions",
  "/life",
  "/budget",
] as const;

export function normalizeMobileNav(
  raw: unknown,
  visible: string[]
): string[] {
  const vis = new Set(visible);
  let list: string[];
  if (Array.isArray(raw)) {
    const seen = new Set<string>();
    list = [];
    for (const h of raw) {
      if (typeof h === "string" && vis.has(h) && !seen.has(h)) {
        list.push(h);
        seen.add(h);
      }
    }
  } else {
    list = DEFAULT_MOBILE_NAV.filter((h) => vis.has(h));
  }
  for (const h of visible) {
    if (list.length >= 4) break;
    if (!list.includes(h) && h !== "/settings") list.push(h);
  }
  return list.slice(0, 4);
}

export function filterMobilePrimary(visible: string[], mobileNav?: string[]) {
  const ordered = normalizeMobileNav(mobileNav ?? null, visible);
  return ordered
    .map((h) => NAV_ITEMS.find((i) => i.href === h)!)
    .filter(Boolean);
}
