export const DEFAULT_USER_ID = "default-user";

export const ACCOUNT_TYPES = {
  cash: { label: "نقد", icon: "banknote" },
  bank: { label: "بانک", icon: "landmark" },
  card: { label: "کارت", icon: "credit-card" },
  wallet: { label: "کیف پول", icon: "wallet" },
} as const;

export const ACCOUNT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export const CATEGORY_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "خوراک",
  "حمل‌ونقل",
  "مسکن",
  "تفریح",
  "سلامت",
  "آموزش",
  "پوشاک",
  "قبوض",
  "خرید",
  "سایر",
];

export const DEFAULT_INCOME_CATEGORIES = [
  "حقوق",
  "فریلنس",
  "سرمایه‌گذاری",
  "هدیه",
  "سایر",
];

export const NAV_GROUPS = [
  {
    titleKey: "nav.group.overview",
    items: [{ href: "/", labelKey: "nav.dashboard", icon: "layout-dashboard" }],
  },
  {
    titleKey: "nav.group.health",
    items: [
      { href: "/nutrition", labelKey: "nav.nutrition", icon: "utensils" },
      { href: "/fitness", labelKey: "nav.fitness", icon: "dumbbell" },
    ],
  },
  {
    titleKey: "nav.group.wellness",
    items: [
      { href: "/cycle", labelKey: "nav.cycle", icon: "heart-pulse" },
      { href: "/selfcare", labelKey: "nav.selfcare", icon: "sparkles" },
      { href: "/sleep", labelKey: "nav.sleep", icon: "moon" },
      { href: "/meds", labelKey: "nav.meds", icon: "pill" },
    ],
  },
  {
    titleKey: "nav.group.life",
    items: [
      { href: "/life", labelKey: "nav.life", icon: "sunrise" },
      { href: "/habits", labelKey: "nav.habits", icon: "flame" },
      { href: "/focus", labelKey: "nav.focus", icon: "timer" },
      { href: "/growth", labelKey: "nav.growth", icon: "book-open" },
      { href: "/journal", labelKey: "nav.journal", icon: "smile" },
      { href: "/travel", labelKey: "nav.travel", icon: "plane" },
      { href: "/maintenance", labelKey: "nav.maintenance", icon: "wrench" },
    ],
  },
  {
    titleKey: "nav.group.finance",
    items: [
      { href: "/transactions", labelKey: "nav.transactions", icon: "arrow-left-right" },
      { href: "/bank-inbox", labelKey: "nav.bankInbox", icon: "inbox" },
      { href: "/insights", labelKey: "nav.insights", icon: "sparkles" },
      { href: "/accounts", labelKey: "nav.accounts", icon: "wallet" },
      { href: "/budget", labelKey: "nav.budget", icon: "piggy-bank" },
      { href: "/debts", labelKey: "nav.debts", icon: "hand-coins" },
      { href: "/assets", labelKey: "nav.assets", icon: "gem" },
      { href: "/goals", labelKey: "nav.goals", icon: "target" },
      { href: "/reports", labelKey: "nav.reports", icon: "bar-chart-3" },
    ],
  },
  {
    titleKey: "nav.group.tools",
    items: [
      { href: "/groups", labelKey: "nav.groups", icon: "users" },
      { href: "/settings", labelKey: "nav.settings", icon: "settings" },
    ],
  },
] as const;

/** @deprecated use NAV_GROUPS — kept for search/mobile helpers */
export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => [...g.items]);

export const MOBILE_NAV_PRIMARY = [
  { href: "/", labelKey: "nav.dashboard", icon: "layout-dashboard" },
  { href: "/transactions", labelKey: "nav.transactions", icon: "arrow-left-right" },
  { href: "/life", labelKey: "nav.life", icon: "sunrise" },
  { href: "/budget", labelKey: "nav.budget", icon: "piggy-bank" },
] as const;

export const TODO_AREAS = {
  work: { label: "کار", color: "#3b82f6" },
  personal: { label: "شخصی", color: "#8b5cf6" },
  health: { label: "سلامت", color: "#10b981" },
  home: { label: "خانه", color: "#f59e0b" },
  other: { label: "سایر", color: "#6b7280" },
} as const;

export const TODO_PRIORITIES = {
  low: { label: "کم", color: "#6b7280" },
  medium: { label: "متوسط", color: "#3b82f6" },
  high: { label: "بالا", color: "#ef4444" },
} as const;

export const ROUTINE_FREQUENCIES = {
  daily: { label: "روزانه" },
  weekly: { label: "هفتگی" },
  monthly: { label: "ماهانه" },
} as const;

export const WEEKDAY_LABELS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
] as const;

export const ASSET_TYPES = {
  gold: { label: "طلا", icon: "gem" },
  stock: { label: "سهام", icon: "trending-up" },
  crypto: { label: "رمزارز", icon: "bitcoin" },
  property: { label: "ملک", icon: "home" },
  currency: { label: "ارز", icon: "banknote" },
  other: { label: "سایر", icon: "box" },
} as const;

export const RECURRING_FREQUENCIES = {
  daily: { label: "روزانه", days: 1 },
  weekly: { label: "هفتگی", days: 7 },
  monthly: { label: "ماهانه", days: 30 },
  yearly: { label: "سالانه", days: 365 },
} as const;

export const DASHBOARD_WIDGETS = {
  balance: { label: "موجودی کل", labelKey: "widget.balance", default: true },
  monthly: { label: "درآمد و هزینه ماه", labelKey: "widget.monthly", default: true },
  chart: { label: "نمودار دسته‌بندی", labelKey: "widget.chart", default: true },
  recent: { label: "آخرین تراکنش‌ها", labelKey: "widget.recent", default: true },
  goals: { label: "اهداف", labelKey: "widget.goals", default: true },
  life: { label: "زندگی امروز", labelKey: "widget.life", default: true },
  forecast: { label: "پیش‌بینی ماهانه", labelKey: "widget.forecast", default: true },
  anomalies: { label: "هشدار ناهنجاری", labelKey: "widget.anomalies", default: true },
} as const;

export type DashboardWidgetId = keyof typeof DASHBOARD_WIDGETS;

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetId[] = [
  "balance",
  "monthly",
  "chart",
  "recent",
  "goals",
  "life",
  "forecast",
  "anomalies",
];
