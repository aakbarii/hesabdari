"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { StatChip } from "@/components/mini-trend";
import { useRecordsRefresh } from "@/components/use-records-refresh";

type Habit = {
  id: string;
  title: string;
  color: string;
  cue: string | null;
  timeOfDay: string | null;
  doneToday: boolean;
  streak: number;
  weekRate: number;
};

type Stats = {
  doneToday: number;
  total: number;
  weekRate: number;
  heatmap: { date: string; label: string; value: number; max: number }[];
  nextAction: string;
  pendingTitles: string[];
};

export function HabitsTab() {
  useRecordsRefresh(() => {
    void load();
  });
  const { t, locale } = useLocale();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [title, setTitle] = useState("");
  const [cue, setCue] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [pending, start] = useTransition();

  const load = () =>
    fetch("/api/habits")
      .then((r) => r.json())
      .then((d) => {
        setHabits(d.habits ?? []);
        setStats(d.stats ?? null);
      })
      .catch(() => toast.error(t("common.error")));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = () => {
    if (!title.trim()) return;
    start(async () => {
      try {
        const res = await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            cue: cue || null,
            timeOfDay: timeOfDay || null,
          }),
        });
        if (!res.ok) throw new Error("fail");
        setTitle("");
        setCue("");
        setTimeOfDay("");
        load();
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const toggle = (habitId: string) => {
    start(async () => {
      try {
        const res = await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "toggle", habitId }),
        });
        if (!res.ok) throw new Error("fail");
        load();
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const nextHint =
    stats?.nextAction === "complete_pending"
      ? locale === "en"
        ? `Still open: ${(stats.pendingTitles ?? []).join(", ")}`
        : `باقی‌مانده: ${(stats.pendingTitles ?? []).join("، ")}`
      : stats?.nextAction === "all_done"
        ? locale === "en"
          ? "All habits done today"
          : "همه عادت‌های امروز انجام شد"
        : locale === "en"
          ? "Add your first habit"
          : "اولین عادت را اضافه کن";

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <StatChip
            label={locale === "en" ? "Today" : "امروز"}
            value={`${stats.doneToday}/${stats.total}`}
          />
          <StatChip
            label={locale === "en" ? "Week rate" : "نرخ هفته"}
            value={`${stats.weekRate}%`}
          />
          <StatChip
            label={locale === "en" ? "Next" : "اقدام بعدی"}
            value={String(stats.total - stats.doneToday)}
            hint={nextHint}
          />
        </div>
      )}

      {stats?.heatmap && (
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {locale === "en" ? "30-day heatmap" : "نقشه پیشرفت ۳۰ روزه"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-10 gap-1.5">
              {stats.heatmap.map((c) => {
                const intensity =
                  c.max <= 0 ? 0 : Math.min(1, c.value / Math.max(1, c.max));
                return (
                  <div
                    key={c.date}
                    title={`${c.date}: ${c.value}`}
                    className="aspect-square rounded-md border border-border/60 transition-colors"
                    style={{
                      backgroundColor:
                        intensity === 0
                          ? "transparent"
                          : `color-mix(in oklab, var(--primary) ${Math.round(intensity * 90)}%, transparent)`,
                    }}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-border/70 overflow-hidden">
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={locale === "en" ? "New habit title" : "عنوان عادت جدید (مثلاً: نوشیدن آب، ورزش، مطالعه)"}
              className="flex-1"
            />
            <Button disabled={pending || !title.trim()} onClick={add} className="rounded-xl">
              <Plus className="h-4 w-4 ml-1" />
              {t("common.add")}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {locale === "en" ? "Cue / Trigger" : "نشانه شروع (Trigger)"}
              </Label>
              <Input
                value={cue}
                onChange={(e) => setCue(e.target.value)}
                placeholder={locale === "en" ? "After breakfast" : "مثال: بعد از بیدار شدن / بعد از ناهار"}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {locale === "en" ? "Time" : "زمان انجام"}
              </Label>
              <Input
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                placeholder={locale === "en" ? "morning / 08:00" : "صبح / ۰۸:۰۰"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>{locale === "en" ? "Habits list" : "فهرست عادت‌ها"}</span>
            <span className="text-xs text-muted-foreground font-normal">{nextHint}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!habits.length && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {locale === "en" ? "Add your first habit above." : "اولین عادت خود را از کادر بالا اضافه کن."}
            </p>
          )}
          {habits.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => toggle(h.id)}
              className={cn(
                "w-full flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm text-start transition-all cursor-pointer",
                h.doneToday ? "border-primary/40 bg-primary/8 shadow-2xs" : "border-border/70 hover:bg-muted/50"
              )}
            >
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: h.color }}
                  />
                  <span className={cn("font-medium truncate", h.doneToday && "line-through text-muted-foreground")}>
                    {h.title}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 font-medium">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {h.streak} روز
                  </span>
                </span>
                {(h.cue || h.timeOfDay) && (
                  <span className="text-[11px] text-muted-foreground ps-4.5 truncate">
                    {[h.timeOfDay, h.cue].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border shrink-0 transition-colors",
                  h.doneToday ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/40"
                )}
              >
                {h.doneToday && <Check className="h-3.5 w-3.5" />}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
