"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Settings2,
  AlertTriangle,
  Target,
  LineChart,
  Sunrise,
  ArrowLeft,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import type { MessageKey } from "@/lib/i18n";
import {
  formatToman,
  formatJalaliDate,
  getJalaliMonthName,
} from "@/lib/format";
import {
  DASHBOARD_WIDGETS,
  type DashboardWidgetId,
} from "@/lib/constants";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const ExpenseCategoryChart = dynamic(
  () =>
    import("@/components/dashboard/expense-category-chart").then(
      (m) => m.ExpenseCategoryChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-xl bg-muted/50" />
    ),
  }
);

interface DashboardData {
  totalBalance: number;
  monthly: { income: number; expense: number; balance: number };
  recent: Array<{
    id: string;
    type: string;
    amount: number;
    description: string | null;
    date: string;
    accountName: string | null;
    categoryName: string | null;
    categoryColor: string | null;
  }>;
  expenses: Array<{
    categoryName: string | null;
    color: string | null;
    total: number;
  }>;
  forecast: {
    projectedIncome: number;
    projectedExpense: number;
    projectedBalance: number;
    avgIncome: number;
    avgExpense: number;
    daysElapsed: number;
    daysInMonth: number;
  };
  anomalies: Array<{
    categoryName: string;
    color: string;
    current: number;
    average: number;
    percentAbove: number;
  }>;
  savingsGoals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    percent: number;
    color: string;
  }>;
  purchaseGoals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    percent: number;
    color: string;
  }>;
  lifeSummary?: {
    todos: { total: number; today: number; overdue: number };
    routines: { dueToday: number; completedToday: number; maxStreak: number };
    todayProgress: number;
  };
  widgets: DashboardWidgetId[];
  year: number;
  month: number;
}

const CHART_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const say = (fa: string, en: string) => (locale === "en" ? en : fa);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState<DashboardWidgetId[]>([]);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [savingWidgets, setSavingWidgets] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let version = 0;
    const load = () => {
      const currentVersion = ++version;
      setLoading(true);
      setError(false);
      fetch("/api/dashboard", { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error("dashboard fetch failed");
          return r.json();
        })
        .then((d) => {
          if (controller.signal.aborted || currentVersion !== version) return;
          setData(d);
          setWidgets(d.widgets ?? []);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            if (currentVersion !== version) return;
            setError(true);
            toast.error(locale === "en" ? "Couldn't load the dashboard" : "خطا در بارگذاری داشبورد");
          }
        })
        .finally(() => { if (!controller.signal.aborted && currentVersion === version) setLoading(false); });
    };
    load();
    const onTx = () => load();
    window.addEventListener("joojo:tx-created", onTx);
    return () => {
      controller.abort();
      window.removeEventListener("joojo:tx-created", onTx);
    };
  }, [reload, locale]);

  const show = (id: DashboardWidgetId) => widgets.includes(id);

  const saveWidgets = async (next: DashboardWidgetId[]) => {
    if (savingWidgets) return;
    setSavingWidgets(true);
    setWidgets(next);
    try {
      const response = await fetch("/api/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgets: next }),
      });
      if (!response.ok) throw new Error("Save failed");
      setReload((value) => value + 1);
      toast.success(t("common.success"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSavingWidgets(false);
    }
  };

  const toggleWidget = async (id: DashboardWidgetId) => {
    const next = widgets.includes(id)
      ? widgets.filter((w) => w !== id)
      : [...widgets, id];
    await saveWidgets(next);
  };

  const moveWidget = async (id: DashboardWidgetId, dir: -1 | 1) => {
    const idx = widgets.indexOf(id);
    if (idx < 0) return;
    const next = [...widgets];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    await saveWidgets(next);
  };

  const chartData =
    data?.expenses.map((e, i) => ({
      name: e.categoryName ?? say("سایر", "Other"),
      value: e.total,
      color: e.color ?? CHART_COLORS[i % CHART_COLORS.length],
    })) ?? [];

  return (
    <>
      <Header title={say("داشبورد", "Dashboard")} />
      <div className="p-4 lg:p-8 space-y-6 motion-stagger">
        <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold sm:text-2xl">{say("خلاصهٔ مالی", "Financial overview")}</h2>
            <p className="text-sm text-muted-foreground">{say("درآمد، هزینه و ماندهٔ ماه جاری", "Income, expenses and balance for this month")}</p>
          </div>
          {data && (
            <div className="border-t border-border pt-4 sm:border-t-0 sm:border-s sm:ps-6 sm:pt-0">
              <p className="text-xs text-muted-foreground">{say("مانده", "Balance")} · {getJalaliMonthName(data.month, locale)}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatToman(data.monthly.balance)}</p>
              <Link href="/reports" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                {say("گزارش مالی", "Financial report")} <ArrowLeft className="size-3.5" />
              </Link>
            </div>
          )}
        </section>
        <div className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-2 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 gap-2">
            <Link
              href="/transactions?new=expense"
              className={cn(
                buttonVariants({ variant: "default" }),
                "min-h-11 flex-1 px-3 text-xs sm:flex-none sm:px-4 sm:text-sm rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border-0"
              )}
            >
              <ArrowDownRight className="h-4 w-4 ml-1" />
              {say("ثبت هزینه", "Add expense")}
            </Link>
            <Link
              href="/transactions?new=income"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "min-h-11 flex-1 px-3 text-xs sm:flex-none sm:px-4 sm:text-sm rounded-2xl font-semibold bg-emerald-50/80 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/60"
              )}
            >
              <ArrowUpRight className="h-4 w-4 ml-1" />
              {say("ثبت درآمد", "Add income")}
            </Link>
          </div>
          <Sheet>
            <SheetTrigger
              aria-label={say("تنظیم ویجت‌ها", "Arrange widgets")}
              title={say("تنظیم ویجت‌ها", "Arrange widgets")}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/80 px-3.5 py-2.5 text-xs sm:text-sm font-medium hover:bg-muted/80 backdrop-blur-xs transition shadow-xs"
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only sm:not-sr-only">{say("تنظیم ویجت‌ها", "Arrange widgets")}</span>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>
                  {locale === "en" ? "Dashboard widgets" : "ویجت‌های داشبورد"}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-2 mt-6">
                {(Object.keys(DASHBOARD_WIDGETS) as DashboardWidgetId[]).map(
                  (id) => {
                    const on = widgets.includes(id);
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 rounded-lg border p-3"
                      >
                        <input
                          disabled={savingWidgets}
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleWidget(id)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm flex-1">
                          {t(DASHBOARD_WIDGETS[id].labelKey as MessageKey)}
                        </span>
                        {on && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={savingWidgets}
                              className="rounded border p-1 hover:bg-muted"
                              onClick={() => moveWidget(id, -1)}
                              aria-label="up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={savingWidgets}
                              className="rounded border p-1 hover:bg-muted"
                              onClick={() => moveWidget(id, 1)}
                              aria-label="down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {error ? (
          <Card><CardContent className="flex flex-col items-center gap-4 py-10 text-center" role="alert">
            <AlertTriangle className="h-9 w-9 text-amber-500" />
            <h2 className="text-lg font-semibold">{say("داشبورد بارگذاری نشد", "Dashboard didn't load")}</h2>
            <p className="text-sm text-muted-foreground">{say("اتصال به سرور را بررسی کنید و دوباره تلاش کنید.", "Check the connection and try again.")}</p>
            <Button variant="outline" onClick={() => setReload((value) => value + 1)}><RefreshCw className="h-4 w-4" /> {say("تلاش دوباره", "Try again")}</Button>
          </CardContent></Card>
        ) : loading ? (
          <div className="dashboard-summary grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className={cn("overflow-hidden", i === 1 && "col-span-2 md:col-span-1")}>
                <CardContent className="h-28 motion-skeleton rounded-lg" />
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {widgets.length === 0 && <Card><CardContent className="py-10 text-center text-muted-foreground">{say("ویجت‌های دلخواهتان را از «تنظیم ویجت‌ها» فعال کنید.", "Turn widgets on from Arrange widgets.")}</CardContent></Card>}
            {show("balance") || show("monthly") ? (
              <div className="dashboard-summary grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                {show("balance") && (
                  <Card className="motion-lift col-span-2 md:col-span-1 rounded-[26px] border-border/70 shadow-xs hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {say("موجودی کل", "Total balance")}
                      </CardTitle>
                      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-accent text-primary">
                        <Wallet className="h-4 w-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                        {formatToman(data.totalBalance)}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {show("monthly") && (
                  <>
                    <Card className="motion-lift rounded-[26px] border-border/70 shadow-xs hover:shadow-md transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                          {say("درآمد", "Income")} {getJalaliMonthName(data.month, locale)}
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-600 dark:bg-emerald-950/40">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatToman(data.monthly.income)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="motion-lift rounded-[26px] border-border/70 shadow-xs hover:shadow-md transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                          {say("هزینه", "Expenses")} {getJalaliMonthName(data.month, locale)}
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-rose-100/80 text-rose-500 dark:bg-rose-950/40">
                          <TrendingDown className="h-4 w-4" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl sm:text-2xl font-bold text-rose-500 dark:text-rose-400">
                          {formatToman(data.monthly.expense)}
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            ) : null}

            {show("forecast") && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <LineChart className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{say("پیش‌بینی ماهانه", "Month forecast")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{say("پیش‌بینی درآمد", "Projected income")}</p>
                      <p className="text-lg font-semibold text-emerald-600">
                        {formatToman(data.forecast.projectedIncome)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {say("میانگین ۳ ماه", "3-month average")}: {formatToman(data.forecast.avgIncome)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{say("پیش‌بینی هزینه", "Projected expenses")}</p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatToman(data.forecast.projectedExpense)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {say("میانگین ۳ ماه", "3-month average")}: {formatToman(data.forecast.avgExpense)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{say("پیش‌بینی مانده", "Projected balance")}</p>
                      <p className={`text-lg font-semibold ${data.forecast.projectedBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatToman(data.forecast.projectedBalance)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {say(`روز ${data.forecast.daysElapsed} از ${data.forecast.daysInMonth}`, `Day ${data.forecast.daysElapsed} of ${data.forecast.daysInMonth}`)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {show("anomalies") && data.anomalies.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-900">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-base">{say("هشدار ناهنجاری", "Unusual spending")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.anomalies.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                        <span>{a.categoryName}</span>
                      </div>
                      <Badge variant="secondary" className="text-amber-700 bg-amber-100">
                        {say(`${a.percentAbove}% بیشتر از میانگین`, `${a.percentAbove}% above average`)}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {show("goals") &&
              (data.savingsGoals.length > 0 || data.purchaseGoals.length > 0) && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{say("اهداف", "Goals")}</CardTitle>
                  </div>
                  <Link href="/goals">
                    <Button variant="ghost" size="sm">{say("مشاهده همه", "See all")}</Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[...data.savingsGoals, ...data.purchaseGoals].map((g) => (
                    <div key={g.id}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{g.name}</span>
                        <span className="font-semibold tabular-nums" style={{ color: g.color }}>
                          {g.percent}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>{formatToman(g.currentAmount)}</span>
                        <span>{formatToman(g.targetAmount)}</span>
                      </div>
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${g.percent}%`,
                            backgroundColor: g.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {show("life") && data.lifeSummary && (
              <Card className="bg-gradient-to-br from-violet-500/5 to-transparent">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sunrise className="h-4 w-4 text-violet-500" />
                    <CardTitle className="text-base">{say("زندگی امروز", "Today")}</CardTitle>
                  </div>
                  <Link href="/life">
                    <Button variant="ghost" size="sm">{say("مشاهده", "Open")}</Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">{say("پیشرفت عادت‌ها", "Habit progress")}</span>
                      <span className="font-semibold">{data.lifeSummary.todayProgress}%</span>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${data.lifeSummary.todayProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div className="rounded-lg border p-3">
                      <p className="text-lg font-semibold">{data.lifeSummary.todos.total}</p>
                      <p className="text-xs text-muted-foreground">{say("کار باز", "Open tasks")}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-lg font-semibold">
                        {data.lifeSummary.routines.completedToday}/{data.lifeSummary.routines.dueToday}
                      </p>
                      <p className="text-xs text-muted-foreground">{say("عادت امروز", "Habits today")}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-lg font-semibold">{data.lifeSummary.routines.maxStreak}</p>
                      <p className="text-xs text-muted-foreground">{say("استریک", "Streak")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(show("chart") || show("recent")) && (
              <div className="grid gap-6 lg:grid-cols-2">
                {show("chart") && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{say("هزینه‌ها بر اساس دسته‌بندی", "Expenses by category")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ExpenseCategoryChart data={chartData} emptyLabel={say("هنوز هزینه‌ای ثبت نشده", "No expenses yet")} />
                    </CardContent>
                  </Card>
                )}

                {show("recent") && (
                  <Card>
                    <CardHeader className="flex items-center justify-between gap-3">
                      <CardTitle>{say("آخرین تراکنش‌ها", "Recent transactions")}</CardTitle>
                      <Link href="/transactions" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">{say("مشاهده همه", "See all")} <ArrowLeft className="h-3 w-3" /></Link>
                    </CardHeader>
                    <CardContent>
                      {data.recent.length > 0 ? (
                        <div className="space-y-3">
                          {data.recent.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${tx.type === "income" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                                  {tx.type === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{tx.description || tx.categoryName || say("بدون عنوان", "Untitled")}</p>
                                  <p className="text-xs text-muted-foreground">{tx.accountName} · {formatJalaliDate(tx.date)}</p>
                                </div>
                              </div>
                              <p className={`font-semibold text-sm ${tx.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                                {tx.type === "income" ? "+" : "-"}{formatToman(tx.amount)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 py-10 text-center"><span className="rounded-2xl bg-primary/8 p-4 text-primary"><Wallet className="h-7 w-7" /></span><p className="font-medium">{say("اولین قدم برای مدیریت مالی", "Start with one account")}</p><p className="text-xs text-muted-foreground">{say("یک حساب بسازید و درآمدها و هزینه‌ها را ثبت کنید.", "Add an account, then record income and expenses.")}</p><Link href="/accounts" className="text-sm font-semibold text-primary hover:underline">{say("مدیریت حساب‌ها ←", "Go to accounts")}</Link></div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
