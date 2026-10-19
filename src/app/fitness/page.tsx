"use client";

import { toISODate } from "@/lib/format";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { Card,   } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, Scale, Flame, Plus, Trash2,  Activity, } from "lucide-react";
import { toast } from "sonner";

interface Workout {
  id: string;
  title: string;
  type: "strength" | "cardio" | "walk" | "flexibility" | "other";
  durationMinutes: number;
  caloriesBurned: number;
  date: string;
  notes: string | null;
}

interface BodyMetric {
  id: string;
  date: string;
  weightKg: number;
  bodyFat: number | null;
  note: string | null;
}

const WORKOUT_TYPES = {
  strength: { label: "قدرتی و بدنسازی", icon: "🏋️" },
  cardio: { label: "هوازی و دویدن", icon: "🏃" },
  walk: { label: "پیاده‌روی", icon: "🚶" },
  flexibility: { label: "انعطاف و یوگا", icon: "🧘" },
  other: { label: "سایر ورزش‌ها", icon: "⚽" },
};

export default function FitnessPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [openWorkout, setOpenWorkout] = useState(false);
  const [openWeight, setOpenWeight] = useState(false);
  const [isPending, startTransition] = useTransition();

  const todayStr = toISODate(new Date());

  const [workoutForm, setWorkoutForm] = useState({
    title: "",
    type: "strength" as Workout["type"],
    durationMinutes: "45",
    caloriesBurned: "300",
    date: todayStr,
    notes: "",
  });

  const [weightForm, setWeightForm] = useState({
    weightKg: "",
    bodyFat: "",
    date: todayStr,
    note: "",
  });

  const loadData = async () => {
    try {
      const res = await fetch("/api/fitness");
      if (res.ok) {
        const json = await res.json();
        setWorkouts(json.workouts);
        setMetrics(json.metrics);
      }
    } catch {}
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/fitness", { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error("Load failed"); return res.json(); })
      .then((json) => { setWorkouts(json.workouts); setMetrics(json.metrics); })
      .catch(() => { if (!controller.signal.aborted) toast.error("دریافت اطلاعات انجام نشد. دوباره تلاش کنید."); });
    return () => controller.abort();
  }, []);

  const handleAddWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/fitness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: workoutForm.title,
            type: workoutForm.type,
            durationMinutes: Number(workoutForm.durationMinutes) || 0,
            caloriesBurned: Number(workoutForm.caloriesBurned) || 0,
            date: workoutForm.date,
            notes: workoutForm.notes || null,
          }),
        });
        if (res.ok) {
          toast.success("تمرین با موفقیت ثبت شد 💪");
          setOpenWorkout(false);
          setWorkoutForm({ title: "", type: "strength", durationMinutes: "45", caloriesBurned: "300", date: todayStr, notes: "" });
          loadData();
        }
      } catch {
        toast.error("خطا در ثبت تمرین");
      }
    });
  };

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightForm.weightKg) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/fitness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "metric",
            weightKg: Number(weightForm.weightKg),
            bodyFat: weightForm.bodyFat ? Number(weightForm.bodyFat) : null,
            date: weightForm.date,
            note: weightForm.note || null,
          }),
        });
        if (res.ok) {
          toast.success("وزن ثبت شد ⚖️");
          setOpenWeight(false);
          setWeightForm({ weightKg: "", bodyFat: "", date: todayStr, note: "" });
          loadData();
        }
      } catch {
        toast.error("خطا در ثبت وزن");
      }
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/fitness/${id}`, { method: "DELETE" });
      toast.success("مورد حذف شد");
      loadData();
    } catch {}
  };

  const totalWorkoutMinutes = workouts.reduce((s, w) => s + w.durationMinutes, 0);
  const totalCaloriesBurned = workouts.reduce((s, w) => s + w.caloriesBurned, 0);
  const latestWeight = metrics.length > 0 ? metrics[0].weightKg : null;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <Header title="ورزش و تناسب اندام" />

      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">باشگاه و وزن روزانه</h2>
              <p className="text-xs text-muted-foreground">ثبت تمرینات بدنسازی، هوازی و ترکینگ تغییرات وزن</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenWeight(true)} className="gap-1.5">
              <Scale className="h-4 w-4" /> ثبت وزن
            </Button>
            <Button size="sm" onClick={() => setOpenWorkout(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> ثبت تمرین جدید
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border shadow-sm p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-emerald-500" /> کل تمرینات ثبت‌شده
            </p>
            <p className="text-3xl font-extrabold mt-2">{workouts.length.toLocaleString("fa-IR")} <span className="text-sm font-normal text-muted-foreground">جلسه</span></p>
            <p className="text-xs text-muted-foreground mt-1">مجموعاً {totalWorkoutMinutes} دقیقه فعالیت ورزشی</p>
          </Card>

          <Card className="border shadow-sm p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-500" /> کالری سوزانده‌شده
            </p>
            <p className="text-3xl font-extrabold mt-2 text-orange-600">{totalCaloriesBurned.toLocaleString("fa-IR")} <span className="text-sm font-normal text-muted-foreground">kcal</span></p>
            <p className="text-xs text-muted-foreground mt-1">انرژی مصرف‌شده در تمرینات</p>
          </Card>

          <Card className="border shadow-sm p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-blue-500" /> آخرین وزن ثبت‌شده
            </p>
            <p className="text-3xl font-extrabold mt-2 text-blue-600">
              {latestWeight ? latestWeight.toLocaleString("fa-IR") : "—"} <span className="text-sm font-normal text-muted-foreground">کیلوگرم</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.length > 0 ? `آخرین ثبت: ${metrics[0].date}` : "هنوز وزنی ثبت نشده"}
            </p>
          </Card>
        </div>

        {/* Content Columns: Workouts & Weight Log */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workouts List (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" /> تمرینات اخیر
              </h3>
            </div>

            {workouts.length === 0 ? (
              <Card className="border p-8 text-center text-muted-foreground text-xs">
                هنوز تمرینی ثبت نکرده‌اید. دکمه «ثبت تمرین جدید» را بزنید!
              </Card>
            ) : (
              <div className="space-y-3">
                {workouts.map((w) => (
                  <Card key={w.id} className="border shadow-sm p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{WORKOUT_TYPES[w.type]?.icon ?? "🏋️"}</span>
                        <span className="font-bold text-sm">{w.title}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {WORKOUT_TYPES[w.type]?.label ?? w.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-3">
                        <span>📅 {w.date}</span>
                        <span>⏱️ {w.durationMinutes} دقیقه</span>
                        <span>🔥 {w.caloriesBurned} کالری</span>
                      </p>
                      {w.notes && <p className="text-xs text-muted-foreground/80 mt-1">{w.notes}</p>}
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive h-8 w-8 hover:bg-destructive/10"
                      onClick={() => handleDelete(w.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Weight Log Sidebar */}
          <div className="space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-500" /> سابقه وزن‌ها
            </h3>

            {metrics.length === 0 ? (
              <Card className="border p-6 text-center text-muted-foreground text-xs">
                هنوز وزنی ثبت نشده است.
              </Card>
            ) : (
              <Card className="border shadow-sm divide-y">
                {metrics.map((m) => (
                  <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-sm text-foreground">{m.weightKg} کیلوگرم</p>
                      <p className="text-[11px] text-muted-foreground">{m.date} {m.bodyFat ? `• چربی: ${m.bodyFat}%` : ""}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive h-7 w-7 hover:bg-destructive/10"
                      onClick={() => handleDelete(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Add Workout Dialog */}
      <Dialog open={openWorkout} onOpenChange={setOpenWorkout}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" /> ثبت جلسه تمرین ورزشی
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWorkout} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="wTitle">عنوان تمرین</Label>
              <Input
                id="wTitle"
                value={workoutForm.title}
                onChange={(e) => setWorkoutForm({ ...workoutForm, title: e.target.value })}
                placeholder="مثلاً: تمرین سینه و پشت‌بازو، ۳۰ دقیقه دویدن"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wType">نوع تمرین</Label>
                <Select
                  value={workoutForm.type}
                  onValueChange={(v) => { if (v && v in WORKOUT_TYPES) setWorkoutForm({ ...workoutForm, type: v as Workout["type"] }); }}
                >
                  <SelectTrigger id="wType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">🏋️ بدنسازی و قدرتی</SelectItem>
                    <SelectItem value="cardio">🏃 دویدن و هوازی</SelectItem>
                    <SelectItem value="walk">🚶 پیاده‌روی</SelectItem>
                    <SelectItem value="flexibility">🧘 یوگا و کشش</SelectItem>
                    <SelectItem value="other">⚽ سایر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wDuration">مدت (دقیقه)</Label>
                <Input
                  id="wDuration"
                  type="number"
                  value={workoutForm.durationMinutes}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, durationMinutes: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wCal">کالری مصرفی (تخمینی)</Label>
                <Input
                  id="wCal"
                  type="number"
                  value={workoutForm.caloriesBurned}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, caloriesBurned: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wDate">تاریخ</Label>
                <Input
                  id="wDate"
                  type="date"
                  value={workoutForm.date}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wNotes">یادداشت تمرین</Label>
              <Input
                id="wNotes"
                value={workoutForm.notes}
                onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
                placeholder="مثلاً: رکورد پرس سینه زده شد"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenWorkout(false)}>انصراف</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "در حال ثبت..." : "ثبت تمرین"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Weight Dialog */}
      <Dialog open={openWeight} onOpenChange={setOpenWeight}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-500" /> ثبت وزن روزانه
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWeight} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="weightKg">وزن (کیلوگرم)</Label>
              <Input
                id="weightKg"
                type="number"
                step="0.1"
                value={weightForm.weightKg}
                onChange={(e) => setWeightForm({ ...weightForm, weightKg: e.target.value })}
                placeholder="مثلاً: 78.5"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bodyFat">درصد چربی بدنی (اختیاری)</Label>
              <Input
                id="bodyFat"
                type="number"
                step="0.1"
                value={weightForm.bodyFat}
                onChange={(e) => setWeightForm({ ...weightForm, bodyFat: e.target.value })}
                placeholder="مثلاً: 16.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weightDate">تاریخ</Label>
              <Input
                id="weightDate"
                type="date"
                value={weightForm.date}
                onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenWeight(false)}>انصراف</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "ثبت..." : "ذخیره وزن"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
