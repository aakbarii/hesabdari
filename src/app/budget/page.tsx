"use client";
import { useRecordsRefresh } from "@/components/use-records-refresh";

import { useEffect, useState, useTransition } from "react";
import moment from "jalali-moment";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ChevronRight, ChevronLeft, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import { formatToman, getJalaliMonthName } from "@/lib/format";
import { toast } from "sonner";
import { AmountInput } from "@/components/amount-input";
import { PageHero } from "@/components/layout/page-hero";
import { MiniTrend } from "@/components/mini-trend";

interface Category {
  id: string;
  name: string;
  type: string;
}

interface BudgetItem {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  spent: number;
  remaining: number;
  percent: number;
}

export default function BudgetPage() {
  useRecordsRefresh(() => { void load(); });
  const [year, setYear] = useState(moment().jYear());
  const [month, setMonth] = useState(moment().jMonth() + 1);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [alerts, setAlerts] = useState<
    { id: string; categoryName: string; percent: number; level: string }[]
  >([]);
  const [trend3m, setTrend3m] = useState<
    { year: number; month: number; totalBudget: number; totalSpent: number }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ categoryId: "", amount: "" });
  const [pending, start] = useTransition();

  const applyBudgetPayload = (d: {
    budgets?: BudgetItem[];
    personal?: BudgetItem[];
    alerts?: typeof alerts;
    trend3m?: typeof trend3m;
  }) => {
    setBudgets(d.budgets ?? d.personal ?? []);
    setAlerts(d.alerts ?? []);
    setTrend3m(d.trend3m ?? []);
  };

  const load = () => {
    fetch(`/api/budgets?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(applyBudgetPayload);
    fetch("/api/categories?type=expense")
      .then((r) => r.json())
      .then(setCategories);
  };

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`/api/budgets?year=${year}&month=${month}`, { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error("Load failed"); return r.json(); }),
      fetch("/api/categories?type=expense", { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error("Load failed"); return r.json(); }),
    ]).then(([budgetData, categoryData]) => {
      applyBudgetPayload(budgetData);
      setCategories(categoryData);
    })
      .catch(() => { if (!controller.signal.aborted) toast.error("دریافت بودجه انجام نشد"); });
    return () => controller.abort();
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else setMonth(month + 1);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: form.categoryId,
        year,
        month,
        amount: parseInt(form.amount.replace(/,/g, "")),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("بودجه ثبت شد");
      setOpen(false);
      setForm({ categoryId: "", amount: "" });
      load();
    } else {
      toast.error(data.error ?? "خطا");
    }
  };

  const categoryItems = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  const deleteBudget = async (id: string) => {
    const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "خطا");
    toast.success("بودجه حذف شد");
    load();
  };

  const applySuggestions = () => {
    start(async () => {
      try {
        const res = await fetch("/api/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "apply-budgets", year, month }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error("fail");
        toast.success(
          data.count
            ? `${data.count} بودجه از میانگین ۳ ماه پیشنهاد و اعمال شد`
            : "پیشنهادی یافت نشد"
        );
        load();
      } catch {
        toast.error("اعمال پیشنهاد بودجه ناموفق بود");
      }
    });
  };

  const rollover = () => {
    start(async () => {
      try {
        const res = await fetch("/api/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "rollover", year, month }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error("fail");
        toast.success(
          data.rolled
            ? `${data.rolled} دسته با مانده ماه قبل رول‌اوور شد`
            : "مانده‌ای برای انتقال نبود"
        );
        load();
      } catch {
        toast.error("رول‌اوور ناموفق بود");
      }
    });
  };

  return (
    <>
      <Header title="بودجه" />
      <div className="p-4 lg:p-8 space-y-6 motion-stagger">
        <PageHero
          heroKey="budget"
          title="بودجه ماهانه"
          subtitle="سقف خرج هر دسته را از رفتار واقعی خودت تنظیم کن"
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="font-semibold min-w-32 text-center">
              {getJalaliMonthName(month)} {year}
            </span>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              disabled={pending}
              onClick={applySuggestions}
            >
              <Sparkles className="h-4 w-4 ml-2" />
              پیشنهاد از میانگین ۳ ماه
            </Button>
            <Button variant="outline" disabled={pending} onClick={rollover}>
              رول‌اوور مانده
            </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              بودجه جدید
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تعیین بودجه ماهانه</DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label>دسته‌بندی</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) =>
                      setForm({ ...form, categoryId: v ?? "" })
                    }
                    items={categoryItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="انتخاب دسته" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>سقف بودجه (تومان)</Label>
                  <AmountInput
                    value={form.amount}
                    onValueChange={(v) => setForm({ ...form, amount: v })}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full">
                  ذخیره
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {alerts.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              هشدار بودجه این ماه
            </p>
            {alerts.map((a) => (
              <p key={a.id} className="text-xs text-muted-foreground">
                {a.categoryName}: {a.percent}%
                {a.level === "exceeded" ? " — رد شده" : " — نزدیک سقف"}
              </p>
            ))}
          </Card>
        )}

        {trend3m.length > 0 && (
          <Card className="p-4 border">
            <p className="text-sm font-semibold mb-2">روند ۳ ماه (خرج)</p>
            <MiniTrend
              points={trend3m.map((t) => ({
                label: `${t.month}`,
                value: t.totalSpent,
              }))}
              colorClass="bg-rose-500/70"
            />
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              {trend3m.map((t) => (
                <span key={`${t.year}-${t.month}`}>
                  {getJalaliMonthName(t.month)}: {formatToman(t.totalSpent)} /{" "}
                  {formatToman(t.totalBudget)}
                </span>
              ))}
            </div>
          </Card>
        )}

        {budgets.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  کل بودجه
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{formatToman(totalBudget)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  کل هزینه شده
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums text-red-600">
                  {formatToman(totalSpent)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card empty:hidden">
          {budgets.map((b) => (
            <div key={b.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: b.categoryColor }}
                    />
                    <span className="font-medium">{b.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatToman(b.spent)} از {formatToman(b.amount)}
                    </span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => deleteBudget(b.id)}
                      aria-label="حذف بودجه"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <Progress
                  value={b.percent}
                  className={`h-2 ${b.percent >= 100 ? "[&_[data-slot=progress-indicator]]:bg-red-500" : b.percent >= 80 ? "[&_[data-slot=progress-indicator]]:bg-amber-500" : ""}`}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {b.percent}% مصرف شده · باقیمانده:{" "}
                  {formatToman(Math.max(0, b.remaining))}
                </p>
            </div>
          ))}
        </div>

        {budgets.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-muted-foreground">
                بودجه‌ای برای این ماه تعریف نشده
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                اولین بودجه را بساز
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
