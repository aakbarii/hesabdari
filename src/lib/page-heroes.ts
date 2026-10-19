/** Atmospheric hero images for each main page (public/heroes/*.jpg) */
export const PAGE_HEROES = {
  dashboard: "/heroes/dashboard.jpg",
  transactions: "/heroes/transactions.jpg",
  bankInbox: "/heroes/bank-inbox.jpg",
  insights: "/heroes/insights.jpg",
  accounts: "/heroes/accounts.jpg",
  budget: "/heroes/budget.jpg",
  debts: "/heroes/debts.jpg",
  assets: "/heroes/assets.jpg",
  goals: "/heroes/goals.jpg",
  reports: "/heroes/reports.jpg",
  nutrition: "/heroes/nutrition.jpg",
  fitness: "/heroes/fitness.jpg",
  cycle: "/heroes/cycle.jpg",
  selfcare: "/heroes/selfcare.jpg",
  sleep: "/heroes/sleep.jpg",
  meds: "/heroes/meds.jpg",
  life: "/heroes/life.jpg",
  habits: "/heroes/habits.jpg",
  focus: "/heroes/focus.jpg",
  growth: "/heroes/growth.jpg",
  journal: "/heroes/journal.jpg",
  travel: "/heroes/travel.jpg",
  maintenance: "/heroes/maintenance.jpg",
  groups: "/heroes/groups.jpg",
  settings: "/heroes/settings.jpg",
  login: "/heroes/login.jpg",
} as const;

export type PageHeroKey = keyof typeof PAGE_HEROES;

export const PAGE_HERO_KEYS = Object.keys(PAGE_HEROES) as PageHeroKey[];

/** Keys users can customize (login is shared/public) */
export const CUSTOMIZABLE_HERO_KEYS = PAGE_HERO_KEYS.filter(
  (k) => k !== "login"
) as Exclude<PageHeroKey, "login">[];

export const PAGE_HERO_LABELS: Record<PageHeroKey, { fa: string; en: string }> = {
  dashboard: { fa: "داشبورد", en: "Dashboard" },
  transactions: { fa: "تراکنش‌ها", en: "Transactions" },
  bankInbox: { fa: "پیامک بانکی", en: "Bank inbox" },
  insights: { fa: "بینش هوشمند", en: "Insights" },
  accounts: { fa: "حساب‌ها", en: "Accounts" },
  budget: { fa: "بودجه", en: "Budget" },
  debts: { fa: "بدهی و طلب", en: "Debts" },
  assets: { fa: "دارایی‌ها", en: "Assets" },
  goals: { fa: "اهداف", en: "Goals" },
  reports: { fa: "گزارش‌ها", en: "Reports" },
  nutrition: { fa: "تغذیه", en: "Nutrition" },
  fitness: { fa: "ورزش", en: "Fitness" },
  cycle: { fa: "چرخه", en: "Cycle" },
  selfcare: { fa: "مراقبت از خود", en: "Self-care" },
  sleep: { fa: "خواب", en: "Sleep" },
  meds: { fa: "دارو", en: "Meds" },
  life: { fa: "تسک و روتین", en: "Life" },
  habits: { fa: "عادت‌ها", en: "Habits" },
  focus: { fa: "تمرکز", en: "Focus" },
  growth: { fa: "رشد", en: "Growth" },
  journal: { fa: "ژورنال", en: "Journal" },
  travel: { fa: "سفر", en: "Travel" },
  maintenance: { fa: "خودرو", en: "Car care" },
  groups: { fa: "گروه‌ها", en: "Groups" },
  settings: { fa: "تنظیمات", en: "Settings" },
  login: { fa: "ورود", en: "Login" },
};

export type HeroPref = {
  /** Hide the hero banner entirely */
  hidden?: boolean;
  /** Custom uploaded file id (stored in receipt_files) */
  fileId?: string | null;
};

export type PageHeroPrefs = Partial<Record<PageHeroKey, HeroPref>>;

export function isPageHeroKey(value: unknown): value is PageHeroKey {
  return typeof value === "string" && value in PAGE_HEROES;
}

export function parsePageHeroPrefs(raw: unknown): PageHeroPrefs {
  if (!raw || typeof raw !== "object") return {};
  const out: PageHeroPrefs = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!isPageHeroKey(key) || !val || typeof val !== "object") continue;
    const v = val as HeroPref;
    out[key] = {
      hidden: Boolean(v.hidden),
      fileId: typeof v.fileId === "string" && v.fileId ? v.fileId : null,
    };
  }
  return out;
}

export function resolveHeroSrc(
  key: PageHeroKey,
  prefs: PageHeroPrefs
): { hidden: boolean; src: string; isCustom: boolean } {
  const pref = prefs[key];
  if (pref?.hidden) {
    return { hidden: true, src: PAGE_HEROES[key], isCustom: false };
  }
  if (pref?.fileId) {
    return {
      hidden: false,
      src: `/api/heroes/file/${pref.fileId}`,
      isCustom: true,
    };
  }
  return { hidden: false, src: PAGE_HEROES[key], isCustom: false };
}
