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
} from "lucide-react";
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState<DashboardWidgetId[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      setLoading(true);
      fetch("/api/dashboard", { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error("dashboard fetch failed");
          return r.json();
        })
        .then((d) => {
          setData(d);
          setWidgets(d.widgets ?? []);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            toast.error("خطا در بارگذاری داشبورد");
          }
        })
        .finally(() => setLoading(false));
    };
    load();
    const onTx = () => load();
    window.addEventListener("hesabdari:tx-created", onTx);
    return () => {
      controller.abort();
      window.removeEventListener("hesabdari:tx-created", onTx);
    };
  }, []);

  const show = (id: DashboardWidgetId) => widgets.includes(id);

  const toggleWidget = async (id: DashboardWidgetId) => {
    const next = widgets.includes(id)
      ? widgets.filter((w) => w !== id)
      : [...widgets, id];
    setWidgets(next);
    await fetch("/api/dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgets: next }),
    });
    toast.success("تنظیمات ذخیره شد");
  };

  const chartData =
    data?.expenses.map((e, i) => ({
      name: e.categoryName ?? "سایر",
      value: e.total,
      color: e.color ?? CHART_COLORS[i % CHART_COLORS.length],
    })) ?? [];

  return (
    <>
      <Header title="داشبورد" />
      <div className="p-4 lg:p-8 space-y-6 motion-stagger">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2">
            <Link
              href="/transactions?new=expense"
              className={cn(
                buttonVariants({ variant: "default" }),
                "bg-red-600 hover:bg-red-600/90"
              )}
            >
              <ArrowDownRight className="h-4 w-4 ml-1" />
              ثبت هزینه
            </Link>
            <Link
              href="/transactions?new=income"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "text-emerald-700 border-emerald-200"
              )}
            >
              <ArrowUpRight className="h-4 w-4 ml-1" />
              ثبت درآمد
            </Link>
          </div>
          <Sheet>
            <SheetTrigger
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <Settings2 className="h-4 w-4" />
              تنظیم ویجت‌ها
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>ویجت‌های داشبورد</SheetTitle>
              </SheetHeader>
              <div className="space-y-2 mt-6">
                {(Object.keys(DASHBOARD_WIDGETS) as DashboardWidgetId[]).map(
                  (id) => (
                    <label
                      key={id}
                      className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={widgets.includes(id)}
                        onChange={() => toggleWidget(id)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">
                        {DASHBOARD_WIDGETS[id].label}
                      </span>
                    </label>
                  )
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="h-28 motion-skeleton rounded-lg" />
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {show("balance") || show("monthly") ? (
              <div className="grid gap-4 md:grid-cols-3">
                {show("balance") && (
                  <Card className="motion-lift">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        موجودی کل
                      </CardTitle>
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {formatToman(data.totalBalance)}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {show("monthly") && (
                  <>
                    <Card className="motion-lift">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          درآمد {getJalaliMonthName(data.month)}
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatToman(data.monthly.income)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="motion-lift">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          هزینه {getJalaliMonthName(data.month)}
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
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
                  <CardTitle className="text-base">پیش‌بینی ماهانه</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">پیش‌بینی درآمد</p>
                      <p className="text-lg font-bold text-emerald-600">
                        {formatToman(data.forecast.projectedIncome)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        میانگین ۳ ماه: {formatToman(data.forecast.avgIncome)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">پیش‌بینی هزینه</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatToman(data.forecast.projectedExpense)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        میانگین ۳ ماه: {formatToman(data.forecast.avgExpense)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">پیش‌بینی مانده</p>
                      <p className={`text-lg font-bold ${data.forecast.projectedBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatToman(data.forecast.projectedBalance)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        روز {data.forecast.daysElapsed} از {data.forecast.daysInMonth}
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
                  <CardTitle className="text-base">هشدار ناهنجاری</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.anomalies.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                        <span>{a.categoryName}</span>
                      </div>
                      <Badge variant="secondary" className="text-amber-700 bg-amber-100">
                        {a.percentAbove}% بیشتر از میانگین
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
                    <CardTitle className="text-base">اهداف</CardTitle>
                  </div>
                  <Link href="/goals">
                    <Button variant="ghost" size="sm">مشاهده همه</Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[...data.savingsGoals, ...data.purchaseGoals].map((g) => (
                    <div key={g.id}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{g.name}</span>
                        <span className="font-bold tabular-nums" style={{ color: g.color }}>
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
                    <CardTitle className="text-base">زندگی امروز</CardTitle>
                  </div>
                  <Link href="/life">
                    <Button variant="ghost" size="sm">مشاهده</Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">پیشرفت عادت‌ها</span>
                      <span className="font-bold">{data.lifeSummary.todayProgress}%</span>
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
                      <p className="text-lg font-bold">{data.lifeSummary.todos.total}</p>
                      <p className="text-xs text-muted-foreground">کار باز</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-lg font-bold">
                        {data.lifeSummary.routines.completedToday}/{data.lifeSummary.routines.dueToday}
                      </p>
                      <p className="text-xs text-muted-foreground">عادت امروز</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-lg font-bold">{data.lifeSummary.routines.maxStreak}</p>
                      <p className="text-xs text-muted-foreground">استریک</p>
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
                      <CardTitle>هزینه‌ها بر اساس دسته‌بندی</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ExpenseCategoryChart data={chartData} />
                    </CardContent>
                  </Card>
                )}

                {show("recent") && (
                  <Card>
                    <CardHeader>
                      <CardTitle>آخرین تراکنش‌ها</CardTitle>
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
                                  <p className="font-medium text-sm">{tx.description || tx.categoryName || "بدون عنوان"}</p>
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
                        <p className="text-center text-muted-foreground py-12">هنوز تراکنشی ثبت نشده</p>
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
