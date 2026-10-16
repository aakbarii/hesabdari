import moment from "jalali-moment";
import { eq, and, sql, desc, gte, lte, like, or, isNull } from "drizzle-orm";
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
  passwordResetTokens,
  pending2faTokens,
  todos,
  routines,
  routineCompletions,
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
import { nanoid } from "./nanoid";
import { generateResetToken, hashResetToken } from "../tokens";

let initialized = false;

declare global {
  // eslint-disable-next-line no-var
  var __hesabdari_initialized__: boolean | undefined;
}

export function ensureDb() {
  if (initialized || globalThis.__hesabdari_initialized__) return;
  runMigrations();
  seedDefaultUser();
  initialized = true;
  globalThis.__hesabdari_initialized__ = true;
}

function seedDefaultUser() {
  const existing = db.select().from(users).where(eq(users.id, DEFAULT_USER_ID)).get();
  if (existing) return;
  db.insert(users)
    .values({
      id: DEFAULT_USER_ID,
      email: "me@local.dev",
      name: "من",
    })
    .run();
  seedUserDefaults(DEFAULT_USER_ID);
}

export function seedUserDefaults(userId: string) {
  DEFAULT_EXPENSE_CATEGORIES.forEach((name, i) => {
    db.insert(categories)
      .values({
        id: nanoid(),
        userId,
        name,
        type: "expense",
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      })
      .run();
  });

  DEFAULT_INCOME_CATEGORIES.forEach((name, i) => {
    db.insert(categories)
      .values({
        id: nanoid(),
        userId,
        name,
        type: "income",
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      })
      .run();
  });

  db.insert(userSettings)
    .values({
      userId,
      dashboardWidgets: JSON.stringify(DEFAULT_DASHBOARD_WIDGETS),
      anomalyThreshold: 30,
      currencyUnit: DEFAULT_CURRENCY_UNIT,
    })
    .run();

  seedDefaultCategoryRules(userId);
}

export function getUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export function getUserById(userId: string) {
  return db.select().from(users).where(eq(users.id, userId)).get();
}

export function anyUserHasPassword() {
  return db
    .select()
    .from(users)
    .all()
    .some((u) => Boolean(u.passwordHash));
}

export function createUserWithDefaults(
  email: string,
  passwordHash: string,
  name: string
) {
  const id = nanoid();
  db.insert(users)
    .values({ id, email, passwordHash, name })
    .run();
  seedUserDefaults(id);
  return id;
}

export function setupDefaultUserPassword(
  email: string,
  passwordHash: string,
  name: string
) {
  db.update(users)
    .set({ email, passwordHash, name })
    .where(eq(users.id, DEFAULT_USER_ID))
    .run();
  return DEFAULT_USER_ID;
}

function seedDefaultCategoryRules(userId: string) {
  const expenseCats = db
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
      const exists = db
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
        db.insert(categoryRules)
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

export function processDueRecurring(userId: string = DEFAULT_USER_ID) {
  const now = new Date();
  const due = db
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
      db.insert(transactions)
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

    db.update(recurringTransactions)
      .set({ nextRunDate: next })
      .where(eq(recurringTransactions.id, rec.id))
      .run();
  }

  return due.length;
}

export function getAccountBalance(accountId: string): number {
  const account = db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .get();
  if (!account) return 0;

  const income = db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.type, "income")
      )
    )
    .get()?.total ?? 0;

  const expense = db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.type, "expense")
      )
    )
    .get()?.total ?? 0;

  const transferOut = db
    .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
    .from(transfers)
    .where(eq(transfers.fromAccountId, accountId))
    .get()?.total ?? 0;

  const transferIn = db
    .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
    .from(transfers)
    .where(eq(transfers.toAccountId, accountId))
    .get()?.total ?? 0;

  return account.initialBalance + income - expense - transferOut + transferIn;
}

export function getTotalBalance(userId: string = DEFAULT_USER_ID): number {
  const initial =
    db
      .select({
        total: sql<number>`COALESCE(SUM(${accounts.initialBalance}), 0)`,
      })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .get()?.total ?? 0;

  const income =
    db
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
      .get()?.total ?? 0;

  const expense =
    db
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
      .get()?.total ?? 0;

  const transferOut =
    db
      .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
      .from(transfers)
      .innerJoin(accounts, eq(transfers.fromAccountId, accounts.id))
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .get()?.total ?? 0;

  const transferIn =
    db
      .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
      .from(transfers)
      .innerJoin(accounts, eq(transfers.toAccountId, accounts.id))
      .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)))
      .get()?.total ?? 0;

  return initial + income - expense - transferOut + transferIn;
}

export function getTotalAssetsValue(userId: string = DEFAULT_USER_ID): number {
  const list = db
    .select()
    .from(assets)
    .where(eq(assets.userId, userId))
    .all();
  return list.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);
}

export function getMonthlyStats(
  userId: string,
  year: number,
  month: number
) {
  const { start, end } = getJalaliMonthRange(year, month);

  const income =
    db
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
      .get()?.total ?? 0;

  const expense =
    db
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
      .get()?.total ?? 0;

  return { income, expense, balance: income - expense };
}

export function getRecentTransactions(userId: string, limit = 10) {
  return db
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

export function getExpenseByCategory(
  userId: string,
  year: number,
  month: number
) {
  const { start, end } = getJalaliMonthRange(year, month);

  return db
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

export function getUserSettings(userId: string = DEFAULT_USER_ID) {
  let settings = db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .get();

  if (!settings) {
    db.insert(userSettings)
      .values({
        userId,
        dashboardWidgets: JSON.stringify(DEFAULT_DASHBOARD_WIDGETS),
        anomalyThreshold: 30,
        currencyUnit: DEFAULT_CURRENCY_UNIT,
      })
      .run();
    settings = db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .get()!;
  }

  const currencyUnit = isCurrencyUnit(settings.currencyUnit)
    ? settings.currencyUnit
    : DEFAULT_CURRENCY_UNIT;

  return {
    ...settings,
    widgets: JSON.parse(settings.dashboardWidgets) as DashboardWidgetId[],
    currencyUnit,
    onboardingCompleted: settings.onboardingCompleted,
  };
}

export function completeOnboarding(userId: string) {
  db.update(userSettings)
    .set({ onboardingCompleted: true })
    .where(eq(userSettings.userId, userId))
    .run();
}

export async function createPending2faToken(userId: string) {
  const token = generateResetToken();
  const tokenHash = await hashResetToken(token);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  db.delete(pending2faTokens)
    .where(eq(pending2faTokens.userId, userId))
    .run();

  db.insert(pending2faTokens)
    .values({
      id: nanoid(),
      userId,
      tokenHash,
      expiresAt,
    })
    .run();

  return token;
}

export async function consumePending2faToken(token: string) {
  const tokenHash = await hashResetToken(token);
  const row = db
    .select()
    .from(pending2faTokens)
    .where(eq(pending2faTokens.tokenHash, tokenHash))
    .get();

  if (!row || row.expiresAt < new Date()) return null;

  db.delete(pending2faTokens)
    .where(eq(pending2faTokens.id, row.id))
    .run();

  return row.userId;
}

export function setTotpPendingSecret(userId: string, secret: string) {
  db.update(users)
    .set({ totpPendingSecret: secret })
    .where(eq(users.id, userId))
    .run();
}

export function enableTotp(userId: string) {
  const user = getUserById(userId);
  if (!user?.totpPendingSecret) return false;
  db.update(users)
    .set({
      totpSecret: user.totpPendingSecret,
      totpPendingSecret: null,
      totpEnabled: true,
    })
    .where(eq(users.id, userId))
    .run();
  return true;
}

export function disableTotp(userId: string) {
  db.update(users)
    .set({
      totpSecret: null,
      totpPendingSecret: null,
      totpEnabled: false,
    })
    .where(eq(users.id, userId))
    .run();
}

export function updateUserCurrency(
  userId: string,
  currencyUnit: CurrencyUnit
) {
  db.update(userSettings)
    .set({ currencyUnit })
    .where(eq(userSettings.userId, userId))
    .run();
  return getUserSettings(userId);
}

export function autoCategorize(
  userId: string,
  description: string | undefined | null,
  type: "income" | "expense"
): string | null {
  if (!description) return null;
  const rules = db
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

export function getMonthlyForecast(userId: string, year: number, month: number) {
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

  const current = getMonthlyStats(userId, year, month);

  const last3Income: number[] = [];
  const last3Expense: number[] = [];
  for (let i = 1; i <= 3; i++) {
    let m = month - i;
    let y = year;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    const stats = getMonthlyStats(userId, y, m);
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

export function getAnomalies(
  userId: string,
  year: number,
  month: number,
  threshold = 30
) {
  const currentExpenses = getExpenseByCategory(userId, year, month);
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
      const past = db
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
        .get()?.total ?? 0;
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

export function getAnnualReport(userId: string, year: number) {
  const months = [];
  let totalIncome = 0;
  let totalExpense = 0;

  for (let m = 1; m <= 12; m++) {
    const stats = getMonthlyStats(userId, year, m);
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

export function getGoals(userId: string, type?: "savings" | "purchase") {
  const conditions = [eq(goals.userId, userId)];
  if (type) conditions.push(eq(goals.type, type));

  return db
    .select()
    .from(goals)
    .where(and(...conditions))
    .orderBy(desc(goals.createdAt))
    .all()
    .map((g) => ({
      ...g,
      percent: Math.min(
        100,
        Math.round((g.currentAmount / g.targetAmount) * 100)
      ),
      remaining: g.targetAmount - g.currentAmount,
    }));
}

export function globalSearch(userId: string, query: string) {
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

  const txs = db
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

  const accs = db
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

  const goalRows = db
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

  const debtRows = db
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

  const cats = db
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

  const todoRows = db
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

  const routineRows = db
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

export function getReminders(userId: string) {
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

  const budgetList = db
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

  const expenses = db
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

  const debtAlerts = db
    .select()
    .from(debts)
    .where(and(eq(debts.userId, userId), eq(debts.status, "active")))
    .all()
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

  const todoAlerts = getTodos(userId, "overdue").map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    level: "overdue" as const,
  }));

  const dueTodayTodos = getTodos(userId, "today").map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    level: "due_today" as const,
  }));

  return { budgetAlerts, debtAlerts, todoAlerts: [...todoAlerts, ...dueTodayTodos] };
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

function isRoutineDueToday(routine: typeof routines.$inferSelect) {
  if (!routine.isActive) return false;
  const today = new Date();
  if (routine.frequency === "daily") return true;
  if (routine.frequency === "weekly") {
    return parseWeeklyDays(routine.weeklyDays).includes(today.getDay());
  }
  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const doneThisMonth = db
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

function getRoutineStreak(routineId: string, frequency: string) {
  if (frequency !== "daily") return 0;
  let streak = 0;
  const cursor = new Date();
  const today = dateKey();
  const doneToday = db
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
    const done = db
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

export function getTodos(
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

  const rows = db
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
export function getTodosWeek(userId: string, offsetWeeks = 0) {
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

  const rows = getTodos(userId, "all");

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

export function getRoutines(userId: string, includeInactive = false) {
  const rows = db
    .select()
    .from(routines)
    .where(eq(routines.userId, userId))
    .orderBy(desc(routines.createdAt))
    .all()
    .filter((r) => includeInactive || r.isActive);

  const today = dateKey();

  return rows.map((routine) => {
    const completedToday = Boolean(
      db
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
      dueToday: isRoutineDueToday(routine),
      streak: getRoutineStreak(routine.id, routine.frequency),
    };
  });
}

export function getLifeSummary(userId: string) {
  const allTodos = getTodos(userId, "all");
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

  const routineRows = getRoutines(userId);
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

export function toggleRoutineCompletion(
  userId: string,
  routineId: string,
  date = dateKey()
) {
  const routine = db.select().from(routines).where(eq(routines.id, routineId)).get();
  if (!routine || routine.userId !== userId) return null;

  const existing = db
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
    db.delete(routineCompletions)
      .where(eq(routineCompletions.id, existing.id))
      .run();
    return { completed: false };
  }

  db.insert(routineCompletions)
    .values({
      id: nanoid(),
      routineId,
      userId,
      completedDate: date,
    })
    .run();

  return { completed: true };
}

export function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
    passwordHash?: string;
  }
) {
  const user = getUserById(userId);
  if (!user) return { error: "کاربر یافت نشد" as const };

  if (data.email && data.email !== user.email) {
    if (getUserByEmail(data.email)) {
      return { error: "این ایمیل قبلاً استفاده شده" as const };
    }
  }

  const updates: Partial<typeof users.$inferInsert> = {};
  if (data.name) updates.name = data.name;
  if (data.email) updates.email = data.email;
  if (data.passwordHash) updates.passwordHash = data.passwordHash;

  if (Object.keys(updates).length > 0) {
    db.update(users).set(updates).where(eq(users.id, userId)).run();
  }

  return { user: getUserById(userId)! };
}

export async function createPasswordResetToken(userId: string) {
  const token = generateResetToken();
  const tokenHash = await hashResetToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  db.delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId))
    .run();

  db.insert(passwordResetTokens)
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
  const row = db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .get();

  if (!row || row.expiresAt < new Date()) return null;

  db.delete(passwordResetTokens)
    .where(eq(passwordResetTokens.id, row.id))
    .run();

  return row.userId;
}

export function deleteBudget(userId: string, budgetId: string) {
  const budget = db.select().from(budgets).where(eq(budgets.id, budgetId)).get();
  if (!budget) return { error: "بودجه یافت نشد" as const };

  if (budget.userId !== userId) {
    return { error: "دسترسی ندارید" as const };
  }

  db.delete(budgets).where(eq(budgets.id, budgetId)).run();
  return { ok: true as const };
}

export function getBudgetsWithSpent(
  userId: string,
  year: number,
  month: number
) {
  const { start, end } = getJalaliMonthRange(year, month);

  const rows = db
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

  const spentByCategory = db
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

export function compareMonths(userId: string, year: number, month: number) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const current = getMonthlyStats(userId, year, month);
  const previous = getMonthlyStats(userId, prevYear, prevMonth);

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
  todos,
  routines,
  routineCompletions,
};
export { DEFAULT_USER_ID } from "../constants";
