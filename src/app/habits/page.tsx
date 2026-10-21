"use client";
import { useRecordsRefresh } from "@/components/use-records-refresh";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Check } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/layout/page-hero";
import { StatChip } from "@/components/mini-trend";

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

export default function HabitsPage() {
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
    <>
      <Header title={t("nav.habits")} />
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 motion-stagger">
        <PageHero
          heroKey="habits"
          title={t("nav.habits")}
          subtitle={
            locale === "en"
              ? "Habits with cues, streaks and monthly heatmap"
              : "عادت با نشانه، استریک و نقشه ماهانه"
          }
        />

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
              label={locale === "en" ? "Next" : "اقدام"}
              value={String(stats.total - stats.doneToday)}
              hint={nextHint}
            />
          </div>
        )}

        {stats?.heatmap && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {locale === "en" ? "30-day heatmap" : "نقشه ۳۰روزه"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-10 gap-1">
                {stats.heatmap.map((c) => {
                  const intensity =
                    c.max <= 0 ? 0 : Math.min(1, c.value / Math.max(1, c.max));
                  return (
                    <div
                      key={c.date}
                      title={`${c.date}: ${c.value}`}
                      className="aspect-square rounded-sm border"
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

        <Card className="border-primary/15 overflow-hidden">
          <CardContent className="space-y-3 pt-5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={locale === "en" ? "New habit" : "عادت جدید"}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  {locale === "en" ? "Cue" : "نشانه"}
                </Label>
                <Input
                  value={cue}
                  onChange={(e) => setCue(e.target.value)}
                  placeholder={locale === "en" ? "After breakfast" : "بعد از صبحانه"}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {locale === "en" ? "Time" : "زمان"}
                </Label>
                <Input
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  placeholder={locale === "en" ? "morning / 08:00" : "صبح / ۰۸:۰۰"}
                />
              </div>
            </div>
            <Button disabled={pending} onClick={add}>
              {t("common.add")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "en" ? "Today" : "امروز"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!habits.length && (
              <p className="text-sm text-muted-foreground">
                {locale === "en" ? "Add your first habit." : "اولین عادت را اضافه کن."}
              </p>
            )}
            {habits.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => toggle(h.id)}
                className={cn(
                  "w-full flex items-center justify-between rounded-xl border px-3 py-3 text-sm text-start",
                  h.doneToday ? "border-primary/40 bg-primary/8" : "hover:bg-muted/50"
                )}
              >
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: h.color }}
                    />
                    <span className="font-medium truncate">{h.title}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {h.streak}
                    </span>
                  </span>
                  {(h.cue || h.timeOfDay) && (
                    <span className="text-[11px] text-muted-foreground ps-4 truncate">
                      {[h.timeOfDay, h.cue].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border shrink-0",
                    h.doneToday && "bg-primary text-primary-foreground border-primary"
                  )}
                >
                  {h.doneToday && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            ))}
            <p className="text-xs text-muted-foreground pt-1">{nextHint}</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
