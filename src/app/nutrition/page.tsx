"use client";

import { toISODate } from "@/lib/format";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Utensils,
  Plus,
  Trash2,
  Droplets,
  Flame,
  Dumbbell,
  Wheat,
  PieChart,

  Sparkles,
} from "lucide-react";


interface Meal {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  date: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  note: string | null;
}

interface NutritionData {
  date: string;
  meals: Meal[];
  summary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalWater: number;
    targetCalories: number;
    targetWater: number;
  };
}

const PRESET_FOODS = [
  { name: "زرشک‌پلو با مرغ", calories: 650, protein: 42, carbs: 70, fat: 22 },
  { name: "قورمه‌سبزی با برنج", calories: 580, protein: 28, carbs: 65, fat: 24 },
  { name: "چلوکباب کوبیده (۲ سیخ)", calories: 750, protein: 45, carbs: 60, fat: 35 },
  { name: "املت گوجه‌فرنگی با نان سنگک", calories: 420, protein: 18, carbs: 45, fat: 18 },
  { name: "تخم‌مرغ آب‌پز (۲ عدد)", calories: 155, protein: 13, carbs: 1, fat: 11 },
  { name: "عدسی با لیمو", calories: 320, protein: 20, carbs: 50, fat: 4 },
  { name: "فیله مرغ گریل (۲۰۰ گرم)", calories: 330, protein: 62, carbs: 0, fat: 7 },
  { name: "برنج سفید کته (یک بشقاب)", calories: 350, protein: 7, carbs: 75, fat: 2 },
  { name: "نان و پنیر و گردو", calories: 280, protein: 12, carbs: 28, fat: 14 },
  { name: "موز متوسط", calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: "سیب درختی", calories: 95, protein: 0, carbs: 25, fat: 0 },
  { name: "سالاد شیرازی", calories: 80, protein: 2, carbs: 12, fat: 3 },
];

export default function NutritionPage() {
  const [data, setData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openAddMeal, setOpenAddMeal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<Meal["mealType"]>("lunch");
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    note: "",
  });

  const todayStr = toISODate(new Date());
  const [currentDate, setCurrentDate] = useState(todayStr);

  const loadData = async (date: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/nutrition?date=${date}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      toast.error("خطا در دریافت اطلاعات تغذیه");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/nutrition?date=${currentDate}`, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error("Load failed"); return res.json(); })
      .then((json) => setData(json))
      .catch(() => { if (!controller.signal.aborted) toast.error("دریافت اطلاعات تغذیه انجام نشد"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [currentDate]);

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("لطفاً نام غذا را وارد کنید");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mealType: selectedMealType,
            date: currentDate,
            name: form.name,
            calories: Number(form.calories) || 0,
            protein: Number(form.protein) || 0,
            carbs: Number(form.carbs) || 0,
            fat: Number(form.fat) || 0,
            note: form.note || null,
          }),
        });

        if (res.ok) {
          toast.success("وعده غذایی با موفقیت ثبت شد");
          setOpenAddMeal(false);
          setForm({ name: "", calories: "", protein: "", carbs: "", fat: "", note: "" });
          loadData(currentDate);
        } else {
          toast.error("خطا در ثبت غذا");
        }
      } catch {
        toast.error("خطا در برقراری ارتباط با سرور");
      }
    });
  };

  const handleLogWater = async (amountMl: number) => {
    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "water",
          date: currentDate,
          amountMl,
        }),
      });
      if (res.ok) {
        toast.success(`+${amountMl} میلی‌لیتر آب ثبت شد 💧`);
        loadData(currentDate);
      }
    } catch {
      toast.error("خطا در ثبت آب");
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      const res = await fetch(`/api/nutrition/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("وعده حذف شد");
        loadData(currentDate);
      }
    } catch {
      toast.error("خطا در حذف");
    }
  };

  const fillPreset = (preset: (typeof PRESET_FOODS)[number]) => {
    setForm({
      name: preset.name,
      calories: preset.calories.toString(),
      protein: preset.protein.toString(),
      carbs: preset.carbs.toString(),
      fat: preset.fat.toString(),
      note: form.note,
    });
  };

  const summary = data?.summary ?? {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalWater: 0,
    targetCalories: 2200,
    targetWater: 2500,
  };

  const calPercent = Math.min(100, Math.round((summary.totalCalories / summary.targetCalories) * 100));
  const waterPercent = Math.min(100, Math.round((summary.totalWater / summary.targetWater) * 100));
  const remainingCalories = Math.max(0, summary.targetCalories - summary.totalCalories);

  const mealSections = [
    { type: "breakfast" as const, title: "صبحانه", icon: "🍳" },
    { type: "lunch" as const, title: "ناهار", icon: "🍲" },
    { type: "dinner" as const, title: "شام", icon: "🥗" },
    { type: "snack" as const, title: "میان‌وعده", icon: "🍎" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <Header title="مدیریت تغذیه و کالری" />

      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {loading && <p role="status" className="text-sm text-muted-foreground">در حال دریافت اطلاعات تغذیه…</p>}
        <PageHero
          heroKey="nutrition"
          title="مدیریت تغذیه و کالری"
          subtitle="ثبت هوشمند غذاها، ماکروها و مصرف آب"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={currentDate === todayStr ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentDate(todayStr)}
              >
                امروز
              </Button>
              <Button
                className="gap-2"
                size="sm"
                onClick={() => {
                  setSelectedMealType("lunch");
                  setOpenAddMeal(true);
                }}
              >
                <Plus className="h-4 w-4" />
                ثبت وعده غذایی
              </Button>
            </div>
          }
        />

        {/* Overview Cards: Calories, Macros, Water */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Calorie Card */}
          <Card className="relative overflow-hidden border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between text-muted-foreground">
                <span>کالری مصرفی امروز</span>
                <Flame className="h-4 w-4 text-orange-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-extrabold">{summary.totalCalories.toLocaleString("fa-IR")}</span>
                  <span className="text-xs text-muted-foreground mr-1">/ {summary.targetCalories.toLocaleString("fa-IR")} کیلوکالری</span>
                </div>
                <Badge variant={summary.totalCalories > summary.targetCalories ? "destructive" : "secondary"}>
                  {remainingCalories > 0 ? `${remainingCalories.toLocaleString("fa-IR")} مانده` : "تکمیل"}
                </Badge>
              </div>
              <Progress value={calPercent} className="h-2.5 bg-muted" />
              <p className="text-xs text-muted-foreground">{calPercent}% از هدف کالری روزانه تامین شده است.</p>
            </CardContent>
          </Card>

          {/* Macros Card */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between text-muted-foreground">
                <span>توزیع درشت‌مغذی‌ها (ماکروها)</span>
                <PieChart className="h-4 w-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5"><Dumbbell className="h-3.5 w-3.5 text-blue-500" /> پروتئین</span>
                  <span>{summary.totalProtein} گرم</span>
                </div>
                <Progress value={Math.min(100, (summary.totalProtein / 140) * 100)} className="h-2 bg-blue-100 dark:bg-blue-950" />

                <div className="flex justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5"><Wheat className="h-3.5 w-3.5 text-amber-500" /> کربوهیدرات</span>
                  <span>{summary.totalCarbs} گرم</span>
                </div>
                <Progress value={Math.min(100, (summary.totalCarbs / 250) * 100)} className="h-2 bg-amber-100 dark:bg-amber-950" />

                <div className="flex justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-rose-500" /> چربی</span>
                  <span>{summary.totalFat} گرم</span>
                </div>
                <Progress value={Math.min(100, (summary.totalFat / 70) * 100)} className="h-2 bg-rose-100 dark:bg-rose-950" />
              </div>
            </CardContent>
          </Card>

          {/* Water Card */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between text-muted-foreground">
                <span>میزان مصرف آب</span>
                <Droplets className="h-4 w-4 text-cyan-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">
                    {summary.totalWater.toLocaleString("fa-IR")}
                  </span>
                  <span className="text-xs text-muted-foreground mr-1">/ {summary.targetWater.toLocaleString("fa-IR")} میلی‌لیتر</span>
                </div>
                <span className="text-xs font-semibold text-cyan-600">~{Math.round(summary.totalWater / 250)} لیوان</span>
              </div>
              <Progress value={waterPercent} className="h-2.5 bg-cyan-100 dark:bg-cyan-950" />
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs border-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950"
                  onClick={() => handleLogWater(250)}
                >
                  + ۲۵۰ml (۱ لیوان)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs border-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950"
                  onClick={() => handleLogWater(500)}
                >
                  + ۵۰۰ml (۱ بطری)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meals by Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mealSections.map((sec) => {
            const sectionMeals = data?.meals.filter((m) => m.mealType === sec.type) ?? [];
            const secCalories = sectionMeals.reduce((s, m) => s + m.calories, 0);

            return (
              <Card key={sec.type} className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{sec.icon}</span>
                    <CardTitle className="text-base font-bold">{sec.title}</CardTitle>
                    <span className="text-xs text-muted-foreground">({sectionMeals.length} مورد)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-semibold">
                      {secCalories.toLocaleString("fa-IR")} kcal
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedMealType(sec.type);
                        setOpenAddMeal(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {sectionMeals.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      هنوز غذایی برای {sec.title} ثبت نشده است.
                    </p>
                  ) : (
                    sectionMeals.map((meal) => (
                      <div
                        key={meal.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold">{meal.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>پ: {meal.protein}g</span>
                            <span>•</span>
                            <span>ک: {meal.carbs}g</span>
                            <span>•</span>
                            <span>چ: {meal.fat}g</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold font-mono text-primary">
                            {meal.calories} kcal
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteMeal(meal.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Add Meal Dialog */}
      <Dialog open={openAddMeal} onOpenChange={setOpenAddMeal}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Utensils className="h-5 w-5 text-primary" />
              ثبت وعده غذایی جدید
            </DialogTitle>
          </DialogHeader>

          {/* Quick Preset Pills */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              غذاهای پیشنهادی سریع (کلیک برای پر شدن):
            </Label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 border rounded-lg bg-muted/20">
              {PRESET_FOODS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => fillPreset(item)}
                  className="text-xs px-2.5 py-1 rounded-md bg-card border hover:bg-primary/10 hover:border-primary/40 transition-colors text-right"
                >
                  {item.name} <span className="text-[10px] text-muted-foreground">({item.calories}c)</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddMeal} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mealType">وعده</Label>
                <Select
                  value={selectedMealType}
                  onValueChange={(v) => setSelectedMealType(v as Meal["mealType"])}
                >
                  <SelectTrigger id="mealType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">🍳 صبحانه</SelectItem>
                    <SelectItem value="lunch">🍲 ناهار</SelectItem>
                    <SelectItem value="dinner">🥗 شام</SelectItem>
                    <SelectItem value="snack">🍎 میان‌وعده</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">نام غذا / نوشیدنی</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثلاً: فیله مرغ و سالاد"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label htmlFor="cal" className="text-xs text-orange-600 font-bold">کالری (kcal)</Label>
                <Input
                  id="cal"
                  type="number"
                  value={form.calories}
                  onChange={(e) => setForm({ ...form, calories: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pro" className="text-xs text-blue-600 font-bold">پروتئین (g)</Label>
                <Input
                  id="pro"
                  type="number"
                  value={form.protein}
                  onChange={(e) => setForm({ ...form, protein: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="carbs" className="text-xs text-amber-600 font-bold">کربوهیدرات (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={form.carbs}
                  onChange={(e) => setForm({ ...form, carbs: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fat" className="text-xs text-rose-600 font-bold">چربی (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  value={form.fat}
                  onChange={(e) => setForm({ ...form, fat: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">یادداشت (اختیاری)</Label>
              <Input
                id="note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="مثلاً: بدون روغن، دستپخت مادر"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenAddMeal(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "در حال ثبت..." : "افزودن غذا"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
