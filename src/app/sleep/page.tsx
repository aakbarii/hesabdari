"use client";
import { useRecordsRefresh } from "@/components/use-records-refresh";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { toISODate } from "@/lib/format";
import { useLocale } from "@/components/locale-provider";
import { MiniTrend, StatChip } from "@/components/mini-trend";

type Log = {
  id: string;
  date: string;
  hours: number | null;
  quality: number;
  energy: number;
};

type Stats = {
  goalHours: number;
  debtHours7d: number;
  avgHours7d: number;
  avgQuality7d: number;
  suggestedBedtime: string;
  today: Log | null;
  trend: { date: string; label: string; hours: number; quality: number; logged: boolean }[];
  nextAction: string;
};

export default function SleepPage() {
  useRecordsRefresh(() => {
    void load();
  });
  const { t, locale } = useLocale();
  const [logs, setLogs] = useState<Log[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [hours, setHours] = useState("7");
  const [quality, setQuality] = useState(4);
  const [energy, setEnergy] = useState(3);
  const [goalHours, setGoalHours] = useState("8");
  const [pending, start] = useTransition();
  const today = toISODate(new Date());

  const load = () =>
    fetch("/api/sleep")
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs ?? []);
        setStats(d.stats ?? null);
        if (d.stats?.goalHours) setGoalHours(String(d.stats.goalHours));
        if (d.stats?.today?.hours != null) setHours(String(d.stats.today.hours));
        if (d.stats?.today?.quality) setQuality(d.stats.today.quality);
        if (d.stats?.today?.energy) setEnergy(d.stats.today.energy);
      })
      .catch(() => toast.error(t("common.error")));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    start(async () => {
      try {
        const res = await fetch("/api/sleep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: today,
            hours: Number(hours) || 0,
            quality,
            energy,
          }),
        });
        if (!res.ok) throw new Error("fail");
        toast.success(t("common.success"));
        load();
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const saveGoal = () => {
    start(async () => {
      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ healthTargets: { sleepHours: Number(goalHours) || 8 } }),
        });
        if (!res.ok) throw new Error("fail");
        toast.success(t("common.success"));
        load();
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const nextHint =
    stats?.nextAction === "log_today"
      ? locale === "en"
        ? "Log last night’s sleep"
        : "خواب دیشب را ثبت کن"
      : stats?.nextAction === "catch_up"
        ? locale === "en"
          ? `Sleep debt ${stats.debtHours7d}h — try bedtime ${stats.suggestedBedtime}`
          : `بدهی خواب ${stats.debtHours7d}س — پیشنهاد خواب ${stats.suggestedBedtime}`
        : stats?.nextAction === "short_night"
          ? locale === "en"
            ? "Short night — add a nap or earlier bedtime"
            : "شب کوتاه بود — چرت یا خواب زودتر"
          : locale === "en"
            ? "On track — keep the rhythm"
            : "روی مسیر — ریتم را حفظ کن";

  return (
    <>
      <Header title={t("nav.sleep")} />
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 motion-stagger">
        <PageHero
          heroKey="sleep"
          title={t("nav.sleep")}
          subtitle={
            locale === "en"
              ? "Track sleep hours, quality and next-day energy"
              : "ثبت ساعت خواب، کیفیت و انرژی روز بعد"
          }
        />

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatChip
              label={locale === "en" ? "Today" : "امروز"}
              value={stats.today?.hours != null ? `${stats.today.hours}h` : "—"}
              hint={stats.today ? `Q${stats.today.quality}` : nextHint}
            />
            <StatChip
              label={locale === "en" ? "7d debt" : "بدهی ۷روز"}
              value={`${stats.debtHours7d}h`}
              hint={locale === "en" ? `Goal ${stats.goalHours}h` : `هدف ${stats.goalHours}س`}
            />
            <StatChip
              label={locale === "en" ? "Avg hours" : "میانگین"}
              value={`${stats.avgHours7d}h`}
            />
            <StatChip
              label={locale === "en" ? "Bedtime" : "ساعت خواب"}
              value={stats.suggestedBedtime}
              hint={locale === "en" ? "Suggested" : "پیشنهادی"}
            />
          </div>
        )}

        <Card className="border-primary/15 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {locale === "en" ? "Quality & duration (7d)" : "کیفیت و مدت (۷روز)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MiniTrend
              points={(stats?.trend ?? []).map((p) => ({
                label: p.label,
                value: p.hours,
              }))}
              max={stats?.goalHours ? stats.goalHours + 2 : 10}
              colorClass="bg-sky-500/80"
            />
            <MiniTrend
              points={(stats?.trend ?? []).map((p) => ({
                label: p.label,
                value: p.quality,
              }))}
              max={5}
              colorClass="bg-violet-500/70"
            />
            <p className="text-xs text-muted-foreground">{nextHint}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/15 overflow-hidden">
          <CardContent className="space-y-4 pt-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>{locale === "en" ? "Hours" : "ساعت"}</Label>
                <Input value={hours} onChange={(e) => setHours(e.target.value)} type="number" />
              </div>
              <div className="space-y-2">
                <Label>{locale === "en" ? "Quality 1–5" : "کیفیت ۱–۵"}</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value) || 3)}
                />
              </div>
              <div className="space-y-2">
                <Label>{locale === "en" ? "Energy 1–5" : "انرژی ۱–۵"}</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={energy}
                  onChange={(e) => setEnergy(Number(e.target.value) || 3)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label>{locale === "en" ? "Sleep goal (h)" : "هدف خواب (ساعت)"}</Label>
                <Input
                  className="w-24"
                  type="number"
                  value={goalHours}
                  onChange={(e) => setGoalHours(e.target.value)}
                />
              </div>
              <Button variant="outline" disabled={pending} onClick={saveGoal}>
                {locale === "en" ? "Save goal" : "ذخیره هدف"}
              </Button>
              <Button disabled={pending} onClick={save}>
                {t("common.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "en" ? "Recent nights" : "شب‌های اخیر"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm"
              >
                <span dir="ltr">{l.date}</span>
                <span className="text-muted-foreground">
                  {l.hours ?? "—"}h · Q{l.quality} · E{l.energy}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
