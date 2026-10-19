"use client";

import { useEffect, useState } from "react";
import moment from "jalali-moment";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { formatToman, getJalaliMonthName } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface MonthlyData {
  monthly: { income: number; expense: number; balance: number };
  expenses: Array<{ categoryName: string | null; color: string | null; total: number }>;
}

interface AnnualData {
  year: number;
  months: Array<{ month: number; monthName: string; income: number; expense: number; balance: number }>;
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
}

interface CompareData {
  year: number;
  month: number;
  prevYear: number;
  prevMonth: number;
  current: { income: number; expense: number; balance: number };
  previous: { income: number; expense: number; balance: number };
  changes: { income: number | null; expense: number | null; balance: number | null };
}

function ChangeBadge({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="text-muted-foreground text-sm">—</span>;
  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  return (
    <span
      className={`text-sm font-medium ${
        positive ? "text-emerald-600" : negative ? "text-red-600" : "text-muted-foreground"
      }`}
    >
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  );
}

export default function ReportsPage() {
  const [year, setYear] = useState(moment().jYear());
  const [month, setMonth] = useState(moment().jMonth() + 1);
  const [monthly, setMonthly] = useState<MonthlyData | null>(null);
  const [annual, setAnnual] = useState<AnnualData | null>(null);
  const [compare, setCompare] = useState<CompareData | null>(null);

  useEffect(() => {
    fetch(`/api/dashboard?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(setMonthly);
    fetch(`/api/reports/annual?year=${year}`)
      .then((r) => r.json())
      .then(setAnnual);
    fetch(`/api/reports/compare?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(setCompare);
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1);
  };

  const barData = monthly ? [{ name: getJalaliMonthName(month), درآمد: monthly.monthly.income, هزینه: monthly.monthly.expense }] : [];
  const categoryData = monthly?.expenses.map((e) => ({ name: e.categoryName ?? "سایر", مبلغ: e.total, fill: e.color ?? "#6b7280" })) ?? [];
  const annualChart = annual?.months.map((m) => ({ name: m.monthName, درآمد: m.income, هزینه: m.expense, مانده: m.balance })) ?? [];
  const compareChart = compare
    ? [
        {
          name: getJalaliMonthName(compare.prevMonth),
          درآمد: compare.previous.income,
          هزینه: compare.previous.expense,
        },
        {
          name: getJalaliMonthName(compare.month),
          درآمد: compare.current.income,
          هزینه: compare.current.expense,
        },
      ]
    : [];

  return (
    <>
      <Header title="گزارش‌ها" />
      <div className="p-4 lg:p-8 space-y-6 motion-stagger">
        <PageHero
          heroKey="reports"
          title="گزارش‌ها"
          subtitle="گزارش ماهانه، مقایسه ماه‌ها و خلاصه سالانه"
        />
        <Tabs defaultValue="monthly">
          <TabsList>
            <TabsTrigger value="monthly">ماهانه</TabsTrigger>
            <TabsTrigger value="compare">مقایسه ماه‌ها</TabsTrigger>
            <TabsTrigger value="annual">سالانه</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-6 mt-4">
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}><ChevronRight className="h-4 w-4" /></Button>
              <span className="font-semibold min-w-32 text-center">{getJalaliMonthName(month)} {year}</span>
              <Button variant="outline" size="icon" onClick={nextMonth}><ChevronLeft className="h-4 w-4" /></Button>
            </div>
            {monthly && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">درآمد</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{formatToman(monthly.monthly.income)}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">هزینه</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{formatToman(monthly.monthly.expense)}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">مانده</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${monthly.monthly.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatToman(monthly.monthly.balance)}</p></CardContent></Card>
                </div>
                <Card>
                  <CardHeader><CardTitle>درآمد و هزینه</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(v) => formatToman(v)} />
                          <Tooltip formatter={(v) => formatToman(Number(v))} />
                          <Legend />
                          <Bar dataKey="درآمد" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="هزینه" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                {categoryData.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>هزینه بر اساس دسته</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={categoryData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(v) => formatToman(v)} />
                            <YAxis type="category" dataKey="name" width={80} />
                            <Tooltip formatter={(v) => formatToman(Number(v))} />
                            <Bar dataKey="مبلغ" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="compare" className="space-y-6 mt-4">
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}><ChevronRight className="h-4 w-4" /></Button>
              <span className="font-semibold min-w-40 text-center">
                {compare
                  ? `${getJalaliMonthName(compare.prevMonth)} vs ${getJalaliMonthName(compare.month)} ${compare.year}`
                  : "..."}
              </span>
              <Button variant="outline" size="icon" onClick={nextMonth}><ChevronLeft className="h-4 w-4" /></Button>
            </div>
            {compare && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm text-muted-foreground">درآمد</CardTitle>
                      <ChangeBadge value={compare.changes.income} />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-emerald-600">{formatToman(compare.current.income)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ماه قبل: {formatToman(compare.previous.income)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm text-muted-foreground">هزینه</CardTitle>
                      <ChangeBadge value={compare.changes.expense} invert />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-red-600">{formatToman(compare.current.expense)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ماه قبل: {formatToman(compare.previous.expense)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm text-muted-foreground">مانده</CardTitle>
                      <ChangeBadge value={compare.changes.balance} />
                    </CardHeader>
                    <CardContent>
                      <p className={`text-xl font-bold ${compare.current.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatToman(compare.current.balance)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ماه قبل: {formatToman(compare.previous.balance)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader><CardTitle>مقایسه دو ماه</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={compareChart}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(v) => formatToman(v)} />
                          <Tooltip formatter={(v) => formatToman(Number(v))} />
                          <Legend />
                          <Bar dataKey="درآمد" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="هزینه" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="annual" className="space-y-6 mt-4">
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setYear(year - 1)}><ChevronRight className="h-4 w-4" /></Button>
              <span className="font-semibold">سال {year}</span>
              <Button variant="outline" size="icon" onClick={() => setYear(year + 1)}><ChevronLeft className="h-4 w-4" /></Button>
            </div>
            {annual && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">کل درآمد سال</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{formatToman(annual.totalIncome)}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">کل هزینه سال</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{formatToman(annual.totalExpense)}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">مانده سال</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${annual.totalBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatToman(annual.totalBalance)}</p></CardContent></Card>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">میانگین درآمد ماهانه</p><p className="text-xl font-bold">{formatToman(annual.avgMonthlyIncome)}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">میانگین هزینه ماهانه</p><p className="text-xl font-bold">{formatToman(annual.avgMonthlyExpense)}</p></CardContent></Card>
                </div>
                <Card>
                  <CardHeader><CardTitle>روند سالانه</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={annualChart}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(v) => formatToman(v)} />
                          <Tooltip formatter={(v) => formatToman(Number(v))} />
                          <Legend />
                          <Line type="monotone" dataKey="درآمد" stroke="#10b981" strokeWidth={2} />
                          <Line type="monotone" dataKey="هزینه" stroke="#ef4444" strokeWidth={2} />
                          <Line type="monotone" dataKey="مانده" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
