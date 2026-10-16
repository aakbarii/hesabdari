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
    title: "نمای کلی",
    items: [{ href: "/", label: "داشبورد", icon: "layout-dashboard" }],
  },
  {
    title: "سلامت و فیتنس",
    items: [
      { href: "/nutrition", label: "کالری و غذا", icon: "utensils" },
      { href: "/fitness", label: "ورزش و وزن", icon: "dumbbell" },
    ],
  },
  {
    title: "زندگی و رشد",
    items: [
      { href: "/life", label: "تسک و روتین", icon: "sunrise" },
      { href: "/focus", label: "تمرکز و پومودورو", icon: "timer" },
      { href: "/growth", label: "کتاب و آموزش", icon: "book-open" },
      { href: "/journal", label: "ژورنال و حال", icon: "smile" },
      { href: "/maintenance", label: "نگهداری خودرو", icon: "wrench" },
    ],
  },
  {
    title: "مالی و دارایی",
    items: [
      { href: "/transactions", label: "تراکنش‌ها", icon: "arrow-left-right" },
      { href: "/accounts", label: "حساب‌ها", icon: "wallet" },
      { href: "/budget", label: "بودجه", icon: "piggy-bank" },
      { href: "/debts", label: "بدهی و طلب", icon: "hand-coins" },
      { href: "/assets", label: "دارایی‌ها", icon: "gem" },
      { href: "/goals", label: "اهداف مالی", icon: "target" },
      { href: "/reports", label: "گزارش‌ها", icon: "bar-chart-3" },
    ],
  },
  {
    title: "ابزار",
    items: [
      { href: "/settings", label: "تنظیمات", icon: "settings" },
    ],
  },
] as const;

/** @deprecated use NAV_GROUPS — kept for search/mobile helpers */
export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => [...g.items]);

export const MOBILE_NAV_PRIMARY = [
  { href: "/", label: "داشبورد", icon: "layout-dashboard" },
  { href: "/transactions", label: "تراکنش‌ها", icon: "arrow-left-right" },
  { href: "/life", label: "زندگی", icon: "sunrise" },
  { href: "/budget", label: "بودجه", icon: "piggy-bank" },
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
  balance: { label: "موجودی کل", default: true },
  monthly: { label: "درآمد و هزینه ماه", default: true },
  chart: { label: "نمودار دسته‌بندی", default: true },
  recent: { label: "آخرین تراکنش‌ها", default: true },
  goals: { label: "اهداف", default: true },
  life: { label: "زندگی امروز", default: true },
  forecast: { label: "پیش‌بینی ماهانه", default: true },
  anomalies: { label: "هشدار ناهنجاری", default: true },
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
