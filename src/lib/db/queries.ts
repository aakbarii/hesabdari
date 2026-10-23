import moment from "jalali-moment";
import { eq, and, sql, desc, gte, lte, like, or, } from "drizzle-orm";
import { db, runMigrations } from "./index";
import {
  users,
  accounts,
  categories,
  transactions,
  transfers,
  budgets,
  debts,
  debtPayments,
  goals,
  goalContributions,
  categoryRules,
  userSettings,
  recurringTransactions,
  assets,
  assetPriceHistory,
  passwordResetTokens,
  todos,
  routines,
  routineCompletions,
  receiptFiles,
} from "./schema";
import {
  DEFAULT_USER_ID,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  CATEGORY_COLORS,
  DEFAULT_DASHBOARD_WIDGETS,
  RECURRING_FREQUENCIES,
  type DashboardWidgetId,
} from "../constants";
import { DEFAULT_CURRENCY_UNIT, type CurrencyUnit, isCurrencyUnit } from "../currency";
import {
  DEFAULT_APPEARANCE_MOOD,
  DEFAULT_ACCENT_COLOR,
  getDefaultVisibleNav,
  isAppearanceMood,
  isAccentColorId,
  isGender,
  filterNavForGender,
  normalizeVisibleNav,
  normalizeMobileNav,
  type AppearanceMood,
  type AccentColorId,
  type Gender,
} from "../appearance";
import { parseHealthTargets, type HealthTargets } from "../health-targets";
import {
  parsePageHeroPrefs,
  type HeroPref,
  type PageHeroKey,
  type PageHeroPrefs,
} from "../page-heroes";
import { nanoid } from "./nanoid";
import { generateResetToken, hashResetToken } from "../tokens";

declare global {

  var __hesabdari_init__: Promise<void> | undefined;
}

/** Runs migrations and default seeding once per process, even when requests race on cold start. */
export function ensureDb(): Promise<void> {
  globalThis.__hesabdari_init__ ??= (async () => {
    await runMigrations();
    await seedDefaultUser();
  })().catch((error) => {
    globalThis.__hesabdari_init__ = undefined;
    throw error;
  });
  return globalThis.__hesabdari_init__;
}

async function seedDefaultUser() {
  const existing = await db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).get();
  if (existing) return;
  await db.insert(users)
    .values({
      id: DEFAULT_USER_ID,
      email: "me@local.dev",
      name: "من",
    })
    .run();
  await seedUserDefaults(DEFAULT_USER_ID);
}

export async function seedUserDefaults(
  userId: string,
  opts?: { gender?: "male" | "female" }
) {
  for (const [i, name] of DEFAULT_EXPENSE_CATEGORIES.entries()) {
    await db.insert(categories)
      .values({
        id: nanoid(),
        userId,
        name,
        type: "expense",
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      })
      .run();
  }

  for (const [i, name] of DEFAULT_INCOME_CATEGORIES.entries()) {
    await db.insert(categories)
      .values({
        id: nanoid(),
        userId,
        name,
        type: "income",
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      })
      .run();
  }

  const gender = opts?.gender;
  const nav = filterNavForGender(getDefaultVisibleNav(), gender);
  const mood = DEFAULT_APPEARANCE_MOOD;

  await db.insert(userSettings)
    .values({
      userId,
      dashboardWidgets: JSON.stringify(DEFAULT_DASHBOARD_WIDGETS),
      anomalyThreshold: 30,
      currencyUnit: DEFAULT_CURRENCY_UNIT,
      gender: gender ?? null,
      appearanceMood: mood,
      accentColor: DEFAULT_ACCENT_COLOR,
      visibleNav: JSON.stringify(nav),
    })
    .run();

  await seedDefaultCategoryRules(userId);
}

export async function getUserByEmail(email: string) {
  return await db.select().from(users).where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`).get();
}

export async function getUserById(userId: string) {
  return await db.select().from(users).where(eq(users.id, userId)).get();
}

export async function anyUserHasPassword() {
  return (await db
    .select()
    .from(users)
    .all())
    .some((u) => Boolean(u.passwordHash));
}

export async function createUserWithDefaults(
  email: string,
  passwordHash: string,
  name: string,
  gender?: Gender
) {
  const id = nanoid();
  await db.insert(users)
    .values({ id, email, passwordHash, name })
    .run();
  await seedUserDefaults(id, { gender });
  return id;
}

export async function setupDefaultUserPassword(
  email: string,
  passwordHash: string,
  name: string
) {
  await db.update(users)
    .set({ email, passwordHash, name })
    .where(eq(users.id, DEFAULT_USER_ID))
    .run();
  return DEFAULT_USER_ID;
}

async function seedDefaultCategoryRules(userId: string) {
  const expenseCats = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .all();

  const rules: Array<[string, string]> = [
    ["سوپرمارکت", "خوراک"],
    ["رستوران", "خوراک"],
    ["اسنپ", "حمل‌ونقل"],
    ["تپسی", "حمل‌ونقل"],
    ["بنزین", "حمل‌ونقل"],
    ["اجاره", "مسکن"],
    ["قبض", "قبوض"],
    ["برق", "قبوض"],
    ["اینترنت", "قبوض"],
    ["حقوق", "حقوق"],
  ];

  for (const [keyword, catName] of rules) {
    const cat = expenseCats.find((c) => c.name === catName);
    if (cat) {
      const exists = await db
        .select()
        .from(categoryRules)
        .where(
          and(
            eq(categoryRules.userId, userId),
            eq(categoryRules.keyword, keyword)
          )
        )
        .get();
      if (!exists) {
        await db.insert(categoryRules)
          .values({
            id: nanoid(),
            userId,
            keyword,
            categoryId: cat.id,
          })
          .run();
      }
    }
  }
}

function getJalaliMonthRange(year: number, month: number) {
  const start = moment()
    .jYear(year)
    .jMonth(month - 1)
    .startOf("jMonth")
    .toDate();
  const end = moment()
    .jYear(year)
    .jMonth(month - 1)
    .endOf("jMonth")
    .toDate();
  return { start, end };
}

function addFrequency(date: Date, frequency: keyof typeof RECURRING_FREQUENCIES): Date {
  const m = moment(date);
  switch (frequency) {
    case "daily":
      return m.add(1, "day").toDate();
    case "weekly":
      return m.add(1, "week").toDate();
    case "monthly":
      return m.add(1, "jMonth").toDate();
    case "yearly":
      return m.add(1, "jYear").toDate();
    default:
      return m.add(1, "month").toDate();
  }
}

export async function processDueRecurring(userId: string = DEFAULT_USER_ID) {
  return await db.transaction(async (tx) => {
    const now = new Date();
    const due = await tx
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.userId, userId),
          eq(recurringTransactions.isActive, true),
          lte(recurringTransactions.nextRunDate, now)
        )
      )
      .all();

    for (const rec of due) {
      let next = new Date(rec.nextRunDate);
      let iterations = 0;

      while (next <= now && iterations < 120) {
        const txId = nanoid();
        await tx.insert(transactions)
          .values({
            id: txId,
            userId: rec.userId,
            accountId: rec.accountId,
            categoryId: rec.categoryId,
            type: rec.type,
            amount: rec.amount,
            description: rec.description
              ? `${rec.description} (تکراری)`
              : "تراکنش تکراری",
            date: new Date(next),
          })
          .run();
        next = addFrequency(next, rec.frequency);
        iterations++;
      }

      await tx.update(recurringTransactions)
        .set({ nextRunDate: next })
        .where(eq(recurringTransactions.id, rec.id))
        .run();
    }

    return due.length;
  }, { behavior: "immediate" });
}

export async function getAccountBalance(accountId: string): Promise<number> {
  const account = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .get();
  if (!account) return 0;

  const income = (await db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.type, "income")
      )
    )
    .get())?.total ?? 0;

  const expense = (await db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.type, "expense")
      )
    )
    .get())?.total ?? 0;

  const transferOut = (await db
    .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
    .from(transfers)
    .where(eq(transfers.fromAccountId, accountId))
    .get())?.total ?? 0;

  const transferIn = (await db
    .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
    .from(transfers)
    .where(eq(transfers.toAccountId, accountId))
    .get())?.total ?? 0;

  return account.initialBalance + income - expense - transferOut + transferIn;
}

export async function getTotalBalance(userId: string = DEFAULT_USER_ID): Promise<number> {
  const initial =
    (await db
      .select({
        total: sql<number>`COALESCE(SUM(${accounts.initialBalance}), 0)`,
      })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .get())?.total ?? 0;

  const income =
    (await db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.isActive, true),
          eq(transactions.type, "income")
        )
      )
      .get())?.total ?? 0;

  const expense =
    (await db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.userId, userId),
          eq(accounts.isActive, true),
          eq(transactions.type, "expense")
        )
      )
      .get())?.total ?? 0;

  const transferOut =
    (await db
      .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
      .from(transfers)
      .innerJoin(accounts, eq(transfers.fromAccountId, accounts.id))
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .get())?.total ?? 0;

  const transferIn =
    (await db
      .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
      .from(transfers)
      .innerJoin(accounts, eq(transfers.toAccountId, accounts.id))
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .get())?.total ?? 0;

  return initial + income - expense - transferOut + transferIn;
}

export async function getTotalAssetsValue(userId: string = DEFAULT_USER_ID): Promise<number> {
  const list = await db
    .select()
    .from(assets)
    .where(eq(assets.userId, userId))
    .all();
  return list.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);
}

export async function getMonthlyStats(
  userId: string,
  year: number,
  month: number
) {
  const { start, end } = getJalaliMonthRange(year, month);

  const income =
    (await db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "income"),
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      )
      .get())?.total ?? 0;

  const expense =
    (await db
      .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      )
      .get())?.total ?? 0;

  return { income, expense, balance: income - expense };
}

export async function getRecentTransactions(userId: string, limit = 10) {
  return await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      description: transactions.description,
      date: transactions.date,
      receiptPath: transactions.receiptPath,
      accountName: accounts.name,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date))
    .limit(limit)
    .all();
}

export async function getExpenseByCategory(
  userId: string,
  year: number,
  month: number
) {
  const { start, end } = getJalaliMonthRange(year, month);

  return await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      color: categories.color,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, start),
        lte(transactions.date, end)
      )
    )
    .groupBy(categories.id)
    .all();
}

export async function getUserSettings(userId: string = DEFAULT_USER_ID) {
  let settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .get();

  if (!settings) {
    await db.insert(userSettings)
      .values({
        userId,
        dashboardWidgets: JSON.stringify(DEFAULT_DASHBOARD_WIDGETS),
        anomalyThreshold: 30,
        currencyUnit: DEFAULT_CURRENCY_UNIT,
        appearanceMood: DEFAULT_APPEARANCE_MOOD,
        accentColor: DEFAULT_ACCENT_COLOR,
        visibleNav: JSON.stringify(getDefaultVisibleNav()),
      })
      .run();
    settings = (await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .get())!;
  }

  const currencyUnit = isCurrencyUnit(settings.currencyUnit)
    ? settings.currencyUnit
    : DEFAULT_CURRENCY_UNIT;

  let visibleNavParsed: unknown = null;
  if (settings.visibleNav) {
    try {
      visibleNavParsed = JSON.parse(settings.visibleNav);
    } catch {
      visibleNavParsed = null;
    }
  }

  const gender = isGender(settings.gender) ? settings.gender : null;
  const visibleNav = filterNavForGender(
    normalizeVisibleNav(visibleNavParsed),
    gender
  );

  let pageHeroesParsed: unknown = null;
  if (settings.pageHeroes) {
    try {
      pageHeroesParsed = JSON.parse(settings.pageHeroes);
    } catch {
      pageHeroesParsed = null;
    }
  }

  let mobileNavParsed: unknown = null;
  if (settings.mobileNav) {
    try {
      mobileNavParsed = JSON.parse(settings.mobileNav);
    } catch {
      mobileNavParsed = null;
    }
  }

  return {
    ...settings,
    widgets: JSON.parse(settings.dashboardWidgets) as DashboardWidgetId[],
    currencyUnit,
    appearanceMood: isAppearanceMood(settings.appearanceMood)
      ? settings.appearanceMood
      : DEFAULT_APPEARANCE_MOOD,
    accentColor: isAccentColorId(settings.accentColor)
      ? settings.accentColor
      : DEFAULT_ACCENT_COLOR,
    visibleNav,
    mobileNav: normalizeMobileNav(mobileNavParsed, visibleNav),
    gender,
    pageHeroes: parsePageHeroPrefs(pageHeroesParsed),
    healthTargets: parseHealthTargets(settings.healthTargets),
    locale: settings.locale === "en" ? "en" : "fa",
    onboardingCompleted: settings.onboardingCompleted,
  };
}

export async function updateHealthTargets(
  userId: string,
  targets: Partial<HealthTargets>
) {
  const current = await getUserSettings(userId);
  const next = parseHealthTargets({ ...current.healthTargets, ...targets });
  await db
    .update(userSettings)
    .set({ healthTargets: JSON.stringify(next) })
    .where(eq(userSettings.userId, userId))
    .run();
  return (await getUserSettings(userId)).healthTargets;
}

export async function updatePageHeroPref(
  userId: string,
  key: PageHeroKey,
  patch: HeroPref | null
) {
  const settings = await getUserSettings(userId);
  const next: PageHeroPrefs = { ...settings.pageHeroes };
  if (patch === null) {
    delete next[key];
  } else {
    const prev = next[key] ?? {};
    const merged: HeroPref = {
      hidden: patch.hidden ?? prev.hidden ?? false,
      fileId:
        patch.fileId === undefined ? (prev.fileId ?? null) : patch.fileId,
    };
    if (!merged.hidden && !merged.fileId) {
      delete next[key];
    } else {
      next[key] = merged;
    }
  }
  await db
    .update(userSettings)
    .set({ pageHeroes: JSON.stringify(next) })
    .where(eq(userSettings.userId, userId))
    .run();
  return (await getUserSettings(userId)).pageHeroes;
}

export async function updateUserGender(userId: string, gender: Gender) {
  const settings = await getUserSettings(userId);
  let nextNav = [...settings.visibleNav];
  if (gender === "female" && !nextNav.includes("/cycle")) {
    nextNav.push("/cycle");
  }
  nextNav = filterNavForGender(nextNav, gender);

  await db
    .update(userSettings)
    .set({
      gender,
      visibleNav: JSON.stringify(normalizeVisibleNav(nextNav)),
    })
    .where(eq(userSettings.userId, userId))
    .run();
  return await getUserSettings(userId);
}

export async function updateUserLocale(userId: string, locale: "fa" | "en") {
  await db
    .update(userSettings)
    .set({ locale })
    .where(eq(userSettings.userId, userId))
    .run();
  return await getUserSettings(userId);
}

export async function updateUserAppearance(
  userId: string,
  data: {
    appearanceMood?: AppearanceMood;
    accentColor?: AccentColorId;
    visibleNav?: string[];
    mobileNav?: string[];
  }
) {
  const updates: Partial<typeof userSettings.$inferInsert> = {};
  if (data.appearanceMood) updates.appearanceMood = data.appearanceMood;
  if (data.accentColor) updates.accentColor = data.accentColor;
  const current = await getUserSettings(userId);
  if (data.visibleNav) {
    updates.visibleNav = JSON.stringify(
      filterNavForGender(normalizeVisibleNav(data.visibleNav), current.gender)
    );
  }
  if (data.mobileNav) {
    const vis = data.visibleNav
      ? filterNavForGender(normalizeVisibleNav(data.visibleNav), current.gender)
      : current.visibleNav;
    updates.mobileNav = JSON.stringify(normalizeMobileNav(data.mobileNav, vis));
  }
  if (Object.keys(updates).length > 0) {
    await db
      .update(userSettings)
      .set(updates)
      .where(eq(userSettings.userId, userId))
      .run();
  }
  return await getUserSettings(userId);
}

export async function completeOnboarding(userId: string) {
  await db.update(userSettings)
    .set({ onboardingCompleted: true })
    .where(eq(userSettings.userId, userId))
    .run();
}

export async function updateUserCurrency(
  userId: string,
  currencyUnit: CurrencyUnit
) {
  await db.update(userSettings)
    .set({ currencyUnit })
    .where(eq(userSettings.userId, userId))
    .run();
  return await getUserSettings(userId);
}

export async function autoCategorize(
  userId: string,
  description: string | undefined | null,
  type: "income" | "expense"
): Promise<string | null> {
  if (!description) return null;
  const rules = await db
    .select({
      keyword: categoryRules.keyword,
      categoryId: categoryRules.categoryId,
      categoryType: categories.type,
    })
    .from(categoryRules)
    .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
    .where(eq(categoryRules.userId, userId))
    .all();

  const lower = description.toLowerCase();
  for (const rule of rules) {
    if (
      rule.categoryType === type &&
      lower.includes(rule.keyword.toLowerCase())
    ) {
      return rule.categoryId;
    }
  }
  return null;
}

export async function getMonthlyForecast(userId: string, year: number, month: number) {
  const { start, end } = getJalaliMonthRange(year, month);
  const now = new Date();
  const monthEnd = end < now ? end : now;
  const daysInMonth = moment()
    .jYear(year)
    .jMonth(month - 1)
    .jDaysInMonth();
  const daysElapsed = Math.max(
    1,
    moment(monthEnd).diff(moment(start), "days") + 1
  );

  const current = await getMonthlyStats(userId, year, month);

  const last3Income: number[] = [];
  const last3Expense: number[] = [];
  for (let i = 1; i <= 3; i++) {
    let m = month - i;
    let y = year;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    const stats = await getMonthlyStats(userId, y, m);
    last3Income.push(stats.income);
    last3Expense.push(stats.expense);
  }

  const avgIncome = Math.round(
    last3Income.reduce((a, b) => a + b, 0) / last3Income.length
  );
  const avgExpense = Math.round(
    last3Expense.reduce((a, b) => a + b, 0) / last3Expense.length
  );

  const projectedIncome = Math.round(
    (current.income / daysElapsed) * daysInMonth
  );
  const projectedExpense = Math.round(
    (current.expense / daysElapsed) * daysInMonth
  );

  return {
    current,
    avgIncome,
    avgExpense,
    projectedIncome,
    projectedExpense,
    projectedBalance: projectedIncome - projectedExpense,
    daysElapsed,
    daysInMonth,
  };
}

export async function getAnomalies(
  userId: string,
  year: number,
  month: number,
  threshold = 30
) {
  const currentExpenses = await getExpenseByCategory(userId, year, month);
  const anomalies: Array<{
    categoryId: string;
    categoryName: string;
    color: string;
    current: number;
    average: number;
    percentAbove: number;
  }> = [];

  for (const cat of currentExpenses) {
    if (!cat.categoryId || cat.total === 0) continue;

    let totalPast = 0;
    let count = 0;
    for (let i = 1; i <= 3; i++) {
      let m = month - i;
      let y = year;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      const { start, end } = getJalaliMonthRange(y, m);
      const past = (await db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.categoryId, cat.categoryId),
            eq(transactions.type, "expense"),
            gte(transactions.date, start),
            lte(transactions.date, end)
          )
        )
        .get())?.total ?? 0;
      totalPast += past;
      count++;
    }

    const average = count > 0 ? totalPast / count : 0;
    if (average > 0 && cat.total > average * (1 + threshold / 100)) {
      anomalies.push({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName ?? "سایر",
        color: cat.color ?? "#6b7280",
        current: cat.total,
        average: Math.round(average),
        percentAbove: Math.round(((cat.total - average) / average) * 100),
      });
    }
  }

  return anomalies.sort((a, b) => b.percentAbove - a.percentAbove);
}

export async function getAnnualReport(userId: string, year: number) {
  const months = [];
  let totalIncome = 0;
  let totalExpense = 0;

  for (let m = 1; m <= 12; m++) {
    const stats = await getMonthlyStats(userId, year, m);
    totalIncome += stats.income;
    totalExpense += stats.expense;
    months.push({
      month: m,
      monthName: moment()
        .jYear(year)
        .jMonth(m - 1)
        .locale("fa")
        .format("jMMMM"),
      ...stats,
    });
  }

  return {
    year,
    months,
    totalIncome,
    totalExpense,
    totalBalance: totalIncome - totalExpense,
    avgMonthlyIncome: Math.round(totalIncome / 12),
    avgMonthlyExpense: Math.round(totalExpense / 12),
  };
}

export async function getGoals(userId: string, type?: "savings" | "purchase") {
  const conditions = [eq(goals.userId, userId)];
  if (type) conditions.push(eq(goals.type, type));

  return (await db
    .select()
    .from(goals)
    .where(and(...conditions))
    .orderBy(desc(goals.createdAt))
    .all())
    .map((g) => ({
      ...g,
      percent: Math.min(
        100,
        Math.round((g.currentAmount / g.targetAmount) * 100)
      ),
      remaining: g.targetAmount - g.currentAmount,
    }));
}

export async function globalSearch(userId: string, query: string) {
  const q = query.trim();
  if (!q) return [];

  const pattern = `%${q}%`;
  const results: Array<{
    type: string;
    id: string;
    title: string;
    subtitle?: string;
    href: string;
  }> = [];

  const txs = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        or(
          like(transactions.description, pattern),
          sql`CAST(${transactions.amount} AS TEXT) LIKE ${pattern}`
        )
      )
    )
    .orderBy(desc(transactions.date))
    .limit(8)
    .all();

  for (const tx of txs) {
    results.push({
      type: "transaction",
      id: tx.id,
      title: tx.description ?? "تراکنش",
      subtitle: `${tx.type === "income" ? "درآمد" : "هزینه"}`,
      href: "/transactions",
    });
  }

  const accs = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), like(accounts.name, pattern)))
    .limit(5)
    .all();
  for (const a of accs) {
    results.push({
      type: "account",
      id: a.id,
      title: a.name,
      href: "/accounts",
    });
  }

  const goalRows = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), like(goals.name, pattern)))
    .limit(5)
    .all();
  for (const g of goalRows) {
    results.push({
      type: "goal",
      id: g.id,
      title: g.name,
      href: "/goals",
    });
  }

  const debtRows = await db
    .select()
    .from(debts)
    .where(and(eq(debts.userId, userId), like(debts.personName, pattern)))
    .limit(5)
    .all();
  for (const d of debtRows) {
    results.push({
      type: "debt",
      id: d.id,
      title: d.personName,
      subtitle: d.type === "owed" ? "طلب" : "بدهی",
      href: "/debts",
    });
  }

  const cats = await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), like(categories.name, pattern)))
    .limit(5)
    .all();
  for (const c of cats) {
    results.push({
      type: "category",
      id: c.id,
      title: c.name,
      href: "/transactions",
    });
  }

  const todoRows = await db
    .select()
    .from(todos)
    .where(and(eq(todos.userId, userId), like(todos.title, pattern)))
    .limit(5)
    .all();
  for (const t of todoRows) {
    results.push({
      type: "todo",
      id: t.id,
      title: t.title,
      subtitle: t.status === "done" ? "انجام‌شده" : "کار",
      href: "/life",
    });
  }

  const routineRows = await db
    .select()
    .from(routines)
    .where(and(eq(routines.userId, userId), like(routines.name, pattern)))
    .limit(5)
    .all();
  for (const r of routineRows) {
    results.push({
      type: "routine",
      id: r.id,
      title: r.name,
      subtitle: "عادت",
      href: "/life",
    });
  }

  return results;
}

export async function getReminders(userId: string) {
  const year = moment().jYear();
  const month = moment().jMonth() + 1;
  const start = moment()
    .jYear(year)
    .jMonth(month - 1)
    .startOf("jMonth")
    .toDate();
  const end = moment()
    .jYear(year)
    .jMonth(month - 1)
    .endOf("jMonth")
    .toDate();

  const budgetList = await db
    .select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      amount: budgets.amount,
      categoryName: categories.name,
    })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .where(
      and(eq(budgets.userId, userId), eq(budgets.year, year), eq(budgets.month, month))
    )
    .all();

  const expenses = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, "expense")))
    .all();

  const spentMap: Record<string, number> = {};
  for (const exp of expenses) {
    if (!exp.categoryId) continue;
    const d = new Date(exp.date);
    if (d >= start && d <= end) {
      spentMap[exp.categoryId] = (spentMap[exp.categoryId] ?? 0) + exp.amount;
    }
  }

  const budgetAlerts = budgetList
    .map((b) => {
      const spent = spentMap[b.categoryId] ?? 0;
      const percent = Math.min(100, Math.round((spent / b.amount) * 100));
      return {
        id: b.id,
        categoryName: b.categoryName,
        spent,
        amount: b.amount,
        percent,
        level: percent >= 100 ? "exceeded" : percent >= 80 ? "warning" : null,
      };
    })
    .filter((b) => b.level)
    .map(({ level, ...rest }) => ({ ...rest, level: level! }));

  const now = new Date();
  const weekLater = new Date(now);
  weekLater.setDate(weekLater.getDate() + 7);

  const debtAlerts = (await db
    .select()
    .from(debts)
    .where(and(eq(debts.userId, userId), eq(debts.status, "active")))
    .all())
    .filter((d) => {
      if (!d.dueDate) return false;
      const due = new Date(d.dueDate);
      return due <= weekLater;
    })
    .map((d) => {
      const due = new Date(d.dueDate!);
      const remaining = d.totalAmount - d.paidAmount;
      const overdue = due < now;
      return {
        id: d.id,
        personName: d.personName,
        type: d.type,
        remaining,
        dueDate: d.dueDate,
        level: overdue ? "overdue" : "due_soon",
      };
    });

  const todoAlerts = (await getTodos(userId, "overdue")).map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    level: "overdue" as const,
  }));

  const dueTodayTodos = (await getTodos(userId, "today")).map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    level: "due_today" as const,
  }));

  // Cycle / period estimate within 3 days
  const cycleAlerts: Array<{ id: string; message: string; level: string; href: string }> = [];
  try {
    const { cycleEntries, cycleSettings, vehicleServices, medications, medicationLogs } =
      await import("@/lib/db/schema");
    const cSettings = await db
      .select()
      .from(cycleSettings)
      .where(eq(cycleSettings.userId, userId))
      .get();
    const starts = (
      await db
        .select()
        .from(cycleEntries)
        .where(
          and(eq(cycleEntries.userId, userId), eq(cycleEntries.kind, "period_start"))
        )
        .all()
    )
      .map((e) => e.date)
      .sort()
      .reverse();
    if (starts[0] && cSettings) {
      const last = new Date(starts[0] + "T12:00:00");
      const next = new Date(last);
      next.setDate(next.getDate() + cSettings.avgCycleLength);
      const days = Math.ceil((next.getTime() - now.getTime()) / 86400000);
      if (days >= 0 && days <= 3) {
        cycleAlerts.push({
          id: `cycle-${starts[0]}`,
          message: days === 0 ? "تخمین پریود: امروز" : `تخمین پریود تا ${days} روز`,
          level: days === 0 ? "due_today" : "due_soon",
          href: "/cycle",
        });
      }
    }

    // Vehicle service due by date or mileage
    const maintenanceAlerts = (
      await db
        .select()
        .from(vehicleServices)
        .where(eq(vehicleServices.userId, userId))
        .all()
    )
      .map((s) => {
        let overdue = false;
        let dueSoon = false;
        let reason = "";
        if (s.nextDueDate) {
          const due = new Date(s.nextDueDate + "T12:00:00");
          const diff = (due.getTime() - now.getTime()) / 86400000;
          if (diff < 0) {
            overdue = true;
            reason = "موعد تاریخ گذشته";
          } else if (diff <= 14) {
            dueSoon = true;
            reason = "موعد تاریخ نزدیک";
          }
        }
        if (s.nextDueMileage != null && s.currentMileage >= s.nextDueMileage) {
          overdue = true;
          reason = reason || "کیلومتر گذشته";
        } else if (
          s.nextDueMileage != null &&
          s.nextDueMileage - s.currentMileage <= 500
        ) {
          dueSoon = true;
          reason = reason || "کیلومتر نزدیک";
        }
        if (!overdue && !dueSoon) return null;
        return {
          id: s.id,
          message: `${s.vehicleName}: ${reason || "سرویس"}`,
          level: overdue ? ("overdue" as const) : ("due_soon" as const),
          href: "/maintenance",
        };
      })
      .filter(Boolean)
      .slice(0, 5) as Array<{
      id: string;
      message: string;
      level: "overdue" | "due_soon";
      href: string;
    }>;

    // Meds not logged today
    const todayKey = dateKey(now);
    const meds = await db
      .select()
      .from(medications)
      .where(and(eq(medications.userId, userId), eq(medications.active, true)))
      .all();
    const logsToday = await db
      .select()
      .from(medicationLogs)
      .where(
        and(eq(medicationLogs.userId, userId), eq(medicationLogs.date, todayKey))
      )
      .all();
    const takenIds = new Set(logsToday.filter((l) => l.taken).map((l) => l.medicationId));
    const medAlerts = meds
      .filter((m) => !takenIds.has(m.id) && m.schedule !== "as_needed")
      .slice(0, 3)
      .map((m) => ({
        id: m.id,
        message: `دارو: ${m.name}`,
        level: "due_today",
        href: "/meds",
      }));

    const settings = await getUserSettings(userId);
    const anomalies = await getAnomalies(
      userId,
      year,
      month,
      settings.anomalyThreshold ?? 30
    );
    const dayOfMonth = moment().jDate();
    const daysInMonth = moment().endOf("jMonth").jDate();
    const monthProgress = dayOfMonth / daysInMonth;
    const anomalyAlerts = anomalies
      .filter((a) => a.percentAbove >= (settings.anomalyThreshold ?? 30) && monthProgress < 0.95)
      .slice(0, 3)
      .map((a) => ({
        id: `anomaly-${a.categoryId ?? a.categoryName}`,
        message: `خرج غیرعادی: ${a.categoryName} (+${a.percentAbove}%)`,
        level: "warning" as const,
        href: "/insights",
      }));

    const debtTips = (await getDebtSettlementSuggestions(userId)).slice(0, 3).map((d) => ({
      id: `debt-tip-${d.id}`,
      message: d.suggestion,
      level: "due_soon" as const,
      href: "/debts",
    }));

    return {
      budgetAlerts,
      debtAlerts,
      todoAlerts: [...todoAlerts, ...dueTodayTodos],
      cycleAlerts,
      maintenanceAlerts,
      medAlerts,
      anomalyAlerts,
      debtTips,
    };
  } catch {
    return {
      budgetAlerts,
      debtAlerts,
      todoAlerts: [...todoAlerts, ...dueTodayTodos],
      cycleAlerts: [],
      maintenanceAlerts: [],
      medAlerts: [],
      anomalyAlerts: [],
      debtTips: [],
    };
  }
}

function dateKey(d: Date = new Date()) {
  return d.toISOString().split("T")[0];
}

function parseWeeklyDays(raw: string | null): number[] {
  if (!raw) return [0, 1, 2, 3, 4, 5, 6];
  try {
    const parsed = JSON.parse(raw) as number[];
    return Array.isArray(parsed) ? parsed : [0, 1, 2, 3, 4, 5, 6];
  } catch {
    return [0, 1, 2, 3, 4, 5, 6];
  }
}

async function isRoutineDueToday(routine: typeof routines.$inferSelect) {
  if (!routine.isActive) return false;
  const today = new Date();
  if (routine.frequency === "daily") return true;
  if (routine.frequency === "weekly") {
    return parseWeeklyDays(routine.weeklyDays).includes(today.getDay());
  }
  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const doneThisMonth = await db
    .select()
    .from(routineCompletions)
    .where(
      and(
        eq(routineCompletions.routineId, routine.id),
        like(routineCompletions.completedDate, `${monthPrefix}%`)
      )
    )
    .get();
  return !doneThisMonth;
}

async function getRoutineStreak(routineId: string, frequency: string) {
  if (frequency !== "daily") return 0;
  let streak = 0;
  const cursor = new Date();
  const today = dateKey();
  const doneToday = await db
    .select()
    .from(routineCompletions)
    .where(
      and(
        eq(routineCompletions.routineId, routineId),
        eq(routineCompletions.completedDate, today)
      )
    )
    .get();
  if (!doneToday) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let i = 0; i < 365; i++) {
    const key = dateKey(cursor);
    const done = await db
      .select()
      .from(routineCompletions)
      .where(
        and(
          eq(routineCompletions.routineId, routineId),
          eq(routineCompletions.completedDate, key)
        )
      )
      .get();
    if (!done) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function getTodos(
  userId: string,
  filter: "all" | "active" | "done" | "today" | "overdue" = "all"
) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const now = new Date();

  const conditions = [eq(todos.userId, userId)];
  if (filter === "active" || filter === "today" || filter === "overdue") {
    conditions.push(eq(todos.status, "active"));
  } else if (filter === "done") {
    conditions.push(eq(todos.status, "done"));
  }

  const rows = await db
    .select()
    .from(todos)
    .where(and(...conditions))
    .orderBy(desc(todos.createdAt))
    .all();

  const priorityRank = { high: 0, medium: 1, low: 2 };

  return rows
    .filter((row) => {
      if (filter === "today") {
        if (!row.dueDate) return false;
        const due = new Date(row.dueDate);
        return due >= todayStart && due <= todayEnd;
      }
      if (filter === "overdue") {
        return Boolean(row.dueDate && new Date(row.dueDate) < now);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      const pa = priorityRank[a.priority];
      const pb = priorityRank[b.priority];
      if (pa !== pb) return pa - pb;
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
}

/** Persian week: Saturday → Friday */
export async function getTodosWeek(userId: string, offsetWeeks = 0) {
  const PERSIAN_WEEKDAYS = [
    "شنبه",
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنجشنبه",
    "جمعه",
  ] as const;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const daysSinceSat = (day + 1) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysSinceSat + offsetWeeks * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const rows = await getTodos(userId, "all");

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const key = dateKey(date);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const done = rows.filter((t) => {
      if (t.status !== "done" || !t.completedAt) return false;
      const c = new Date(t.completedAt);
      return c >= dayStart && c <= dayEnd;
    });

    const planned = rows.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      if (due < dayStart || due > dayEnd) return false;
      // don't duplicate if already listed as done that day
      return !done.some((d) => d.id === t.id);
    });

    return {
      date: key,
      weekday: PERSIAN_WEEKDAYS[i],
      jalali: moment(date).locale("fa").format("jD jMMMM"),
      isToday: key === dateKey(today),
      isFuture: dayStart > today,
      done,
      planned,
    };
  });

  const doneCount = days.reduce((n, d) => n + d.done.length, 0);
  const plannedCount = days.reduce((n, d) => n + d.planned.length, 0);

  return {
    weekStart: dateKey(weekStart),
    weekEnd: dateKey(weekEnd),
    weekLabel: `${moment(weekStart).locale("fa").format("jD jMMMM")} — ${moment(weekEnd).locale("fa").format("jD jMMMM")}`,
    offsetWeeks,
    doneCount,
    plannedCount,
    days,
  };
}

export async function getRoutines(userId: string, includeInactive = false) {
  const rows = (await db
    .select()
    .from(routines)
    .where(eq(routines.userId, userId))
    .orderBy(desc(routines.createdAt))
    .all())
    .filter((r) => includeInactive || r.isActive);

  const today = dateKey();

  return Promise.all(rows.map(async (routine) => {
    const completedToday = Boolean(
      await db
        .select()
        .from(routineCompletions)
        .where(
          and(
            eq(routineCompletions.routineId, routine.id),
            eq(routineCompletions.completedDate, today)
          )
        )
        .get()
    );
    return {
      ...routine,
      weeklyDays: parseWeeklyDays(routine.weeklyDays),
      completedToday,
      dueToday: await isRoutineDueToday(routine),
      streak: await getRoutineStreak(routine.id, routine.frequency),
    };
  }));
}

export async function getLifeSummary(userId: string) {
  const allTodos = await getTodos(userId, "all");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const now = new Date();

  let activeCount = 0;
  let todayCount = 0;
  let overdueCount = 0;
  let doneCount = 0;
  for (const t of allTodos) {
    if (t.status === "done") {
      doneCount++;
      continue;
    }
    activeCount++;
    if (t.dueDate) {
      const due = new Date(t.dueDate);
      if (due >= todayStart && due <= todayEnd) todayCount++;
      if (due < now) overdueCount++;
    }
  }

  const routineRows = await getRoutines(userId);
  const dueToday = routineRows.filter((r) => r.dueToday);
  const completedToday = dueToday.filter((r) => r.completedToday);

  return {
    todos: {
      total: activeCount,
      today: todayCount,
      overdue: overdueCount,
      done: doneCount,
    },
    routines: {
      total: routineRows.length,
      dueToday: dueToday.length,
      completedToday: completedToday.length,
      maxStreak: routineRows.reduce((max, r) => Math.max(max, r.streak), 0),
    },
    todayProgress:
      dueToday.length === 0
        ? 100
        : Math.round((completedToday.length / dueToday.length) * 100),
  };
}

export async function toggleRoutineCompletion(
  userId: string,
  routineId: string,
  date = dateKey()
) {
  const routine = await db.select().from(routines).where(eq(routines.id, routineId)).get();
  if (!routine || routine.userId !== userId) return null;

  const existing = await db
    .select()
    .from(routineCompletions)
    .where(
      and(
        eq(routineCompletions.routineId, routineId),
        eq(routineCompletions.completedDate, date)
      )
    )
    .get();

  if (existing) {
    await db.delete(routineCompletions)
      .where(eq(routineCompletions.id, existing.id))
      .run();
    return { completed: false };
  }

  await db.insert(routineCompletions)
    .values({
      id: nanoid(),
      routineId,
      userId,
      completedDate: date,
    })
    .run();

  return { completed: true };
}

export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
    passwordHash?: string;
  }
) {
  const user = await getUserById(userId);
  if (!user) return { error: "کاربر یافت نشد" as const };

  if (data.email && data.email !== user.email) {
    const existing = await getUserByEmail(data.email);
    if (existing && existing.id !== userId) {
      return { error: "این ایمیل قبلاً استفاده شده" as const };
    }
  }

  const updates: Partial<typeof users.$inferInsert> = {};
  if (data.name) updates.name = data.name;
  if (data.email) updates.email = data.email;
  if (data.passwordHash) updates.passwordHash = data.passwordHash;

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, userId)).run();
  }

  return { user: (await getUserById(userId))! };
}

export async function createPasswordResetToken(userId: string) {
  const token = generateResetToken();
  const tokenHash = await hashResetToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId))
    .run();

  await db.insert(passwordResetTokens)
    .values({
      id: nanoid(),
      userId,
      tokenHash,
      expiresAt,
    })
    .run();

  return token;
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = await hashResetToken(token);
  const row = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .get();

  if (!row || row.expiresAt < new Date()) return null;

  await db.delete(passwordResetTokens)
    .where(eq(passwordResetTokens.id, row.id))
    .run();

  return row.userId;
}

export async function deleteBudget(userId: string, budgetId: string) {
  const budget = await db.select().from(budgets).where(eq(budgets.id, budgetId)).get();
  if (!budget) return { error: "بودجه یافت نشد" as const };

  if (budget.userId !== userId) {
    return { error: "دسترسی ندارید" as const };
  }

  await db.delete(budgets).where(eq(budgets.id, budgetId)).run();
  return { ok: true as const };
}

export async function getBudgetsWithSpent(
  userId: string,
  year: number,
  month: number
) {
  const { start, end } = getJalaliMonthRange(year, month);

  const rows = await db
    .select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      amount: budgets.amount,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.year, year),
        eq(budgets.month, month)
      )
    )
    .all();

  const spentByCategory = await db
    .select({
      categoryId: transactions.categoryId,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, start),
        lte(transactions.date, end)
      )
    )
    .groupBy(transactions.categoryId)
    .all();

  const spentMap = new Map(
    spentByCategory
      .filter((s) => s.categoryId)
      .map((s) => [s.categoryId!, Number(s.total) || 0])
  );

  return rows.map((b) => {
    const spent = spentMap.get(b.categoryId) ?? 0;
    return {
      ...b,
      spent,
      remaining: b.amount - spent,
      percent: Math.min(100, Math.round((spent / b.amount) * 100)),
    };
  });
}

export async function compareMonths(userId: string, year: number, month: number) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const current = await getMonthlyStats(userId, year, month);
  const previous = await getMonthlyStats(userId, prevYear, prevMonth);

  const change = (curr: number, prev: number) =>
    prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);

  return {
    year,
    month,
    prevYear,
    prevMonth,
    current,
    previous,
    changes: {
      income: change(current.income, previous.income),
      expense: change(current.expense, previous.expense),
      balance: change(current.balance, previous.balance),
    },
  };
}

export async function learnCategoryRule(
  userId: string,
  description: string,
  categoryId: string
) {
  const keyword = description
    .replace(/[0-9۰-۹,.\-_/\\]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 2)
    .join(" ")
    .slice(0, 40);
  if (!keyword) return;
  const existing = await db
    .select()
    .from(categoryRules)
    .where(
      and(
        eq(categoryRules.userId, userId),
        eq(categoryRules.keyword, keyword)
      )
    )
    .get();
  if (existing) {
    await db
      .update(categoryRules)
      .set({ categoryId })
      .where(eq(categoryRules.id, existing.id))
      .run();
    return;
  }
  await db
    .insert(categoryRules)
    .values({ id: nanoid(), userId, keyword, categoryId })
    .run();
}

/** Average expense per category over previous 3 Jalali months */
export async function suggestBudgetsFromAvg(
  userId: string,
  year: number,
  month: number
) {
  const cats = await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.type, "expense")))
    .all();

  const suggestions: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }> = [];

  for (const cat of cats) {
    let total = 0;
    for (let i = 1; i <= 3; i++) {
      let m = month - i;
      let y = year;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      const { start, end } = getJalaliMonthRange(y, m);
      const past =
        (
          await db
            .select({
              total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                eq(transactions.categoryId, cat.id),
                eq(transactions.type, "expense"),
                gte(transactions.date, start),
                lte(transactions.date, end)
              )
            )
            .get()
        )?.total ?? 0;
      total += past;
    }
    const avg = Math.round(total / 3);
    if (avg >= 10000) {
      suggestions.push({
        categoryId: cat.id,
        categoryName: cat.name,
        amount: avg,
      });
    }
  }

  return suggestions.sort((a, b) => b.amount - a.amount);
}

export async function applyBudgetSuggestions(
  userId: string,
  year: number,
  month: number
) {
  const suggestions = await suggestBudgetsFromAvg(userId, year, month);
  const ids: string[] = [];
  for (const s of suggestions) {
    const existing = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.categoryId, s.categoryId),
          eq(budgets.year, year),
          eq(budgets.month, month)
        )
      )
      .get();
    if (existing) {
      await db
        .update(budgets)
        .set({ amount: s.amount })
        .where(eq(budgets.id, existing.id))
        .run();
      ids.push(existing.id);
    } else {
      const id = nanoid();
      await db
        .insert(budgets)
        .values({
          id,
          userId,
          categoryId: s.categoryId,
          year,
          month,
          amount: s.amount,
        })
        .run();
      ids.push(id);
    }
  }
  return { count: ids.length, suggestions };
}

/** Stub rate sync — updates gold/currency unit prices with built-in reference map */
export async function syncAssetRates(userId: string) {
  const rates: Record<string, number> = {
    gold: 7_200_000, // approx toman / gram (placeholder)
    currency_usd: 920_000,
    currency_eur: 1_000_000,
  };
  const list = await db
    .select()
    .from(assets)
    .where(eq(assets.userId, userId))
    .all();
  let updated = 0;
  for (const a of list) {
    let price: number | null = null;
    if (a.type === "gold") price = rates.gold;
    else if (a.type === "currency") {
      const name = a.name.toLowerCase();
      if (/دلار|usd|dollar/.test(name)) price = rates.currency_usd;
      else if (/یورو|eur|euro/.test(name)) price = rates.currency_eur;
    }
    if (price && price !== a.unitPrice) {
      await db
        .update(assets)
        .set({ unitPrice: price })
        .where(eq(assets.id, a.id))
        .run();
      await db
        .insert(assetPriceHistory)
        .values({
          id: nanoid(),
          assetId: a.id,
          userId,
          unitPrice: price,
          recordedAt: new Date(),
        })
        .run();
      updated++;
    }
  }
  return { updated, rates, note: "placeholder rates — replace with live feed later" };
}

export async function getAssetPriceHistory(userId: string, assetId?: string, limit = 30) {
  const rows = await db
    .select()
    .from(assetPriceHistory)
    .where(
      assetId
        ? and(eq(assetPriceHistory.userId, userId), eq(assetPriceHistory.assetId, assetId))
        : eq(assetPriceHistory.userId, userId)
    )
    .orderBy(desc(assetPriceHistory.recordedAt))
    .limit(limit)
    .all();
  return rows;
}

export async function getDebtSettlementSuggestions(userId: string) {
  const now = new Date();
  const weekLater = new Date(now);
  weekLater.setDate(weekLater.getDate() + 7);
  const active = await db
    .select()
    .from(debts)
    .where(and(eq(debts.userId, userId), eq(debts.status, "active")))
    .all();
  return active
    .filter((d) => d.dueDate && new Date(d.dueDate) <= weekLater)
    .map((d) => {
      const remaining = d.totalAmount - d.paidAmount;
      return {
        id: d.id,
        personName: d.personName,
        type: d.type,
        remaining,
        dueDate: d.dueDate,
        suggestion:
          d.type === "owing"
            ? `پیشنهاد پرداخت ${remaining.toLocaleString("fa-IR")} تومان به ${d.personName}`
            : `پیگیری دریافت ${remaining.toLocaleString("fa-IR")} تومان از ${d.personName}`,
      };
    });
}

export async function completeRoutinesBySlot(
  userId: string,
  slot: "morning" | "night",
  date?: string
) {
  const day = date ?? new Date().toISOString().slice(0, 10);
  const list = await getRoutines(userId);
  const morningRe = /صبح|morning|بیدار|breakfast/i;
  const nightRe = /شب|night|خواب|sleep|evening/i;
  const matched = list.filter((r) => {
    const blob = `${r.name} ${r.description ?? ""} ${r.timeOfDay ?? ""}`;
    return slot === "morning" ? morningRe.test(blob) : nightRe.test(blob);
  });
  let completed = 0;
  for (const r of matched) {
    if (!r.completedToday) {
      await toggleRoutineCompletion(userId, r.id, day);
      completed++;
    }
  }
  return { matched: matched.length, completed, date: day };
}

export {
  db,
  users,
  accounts,
  categories,
  transactions,
  transfers,
  budgets,
  debts,
  debtPayments,
  goals,
  goalContributions,
  categoryRules,
  userSettings,
  recurringTransactions,
  assets,
  assetPriceHistory,
  todos,
  routines,
  routineCompletions,
  receiptFiles,
};
export { DEFAULT_USER_ID } from "../constants";
