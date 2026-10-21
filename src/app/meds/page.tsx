"use client";
import { useRecordsRefresh } from "@/components/use-records-refresh";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { StatChip } from "@/components/mini-trend";

type Med = {
  id: string;
  name: string;
  dose: string | null;
  schedule: string;
  reminderHour: number;
};

type Stats = {
  adherenceToday: number;
  adherenceWeek: number;
  takenToday: number;
  expectedToday: number;
  pendingCount: number;
  nextAction: string;
  history: { id: string; date: string; name: string; taken: boolean }[];
};

export default function MedsPage() {
  useRecordsRefresh(() => {
    void load();
  });
  const { t, locale } = useLocale();
  const [meds, setMeds] = useState<Med[]>([]);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Stats | null>(null);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [pending, start] = useTransition();

  const load = () =>
    fetch("/api/meds")
      .then((r) => r.json())
      .then((d) => {
        setMeds(d.meds ?? []);
        setTaken(new Set((d.logsToday ?? []).map((l: { medicationId: string }) => l.medicationId)));
        setStats(d.stats ?? null);
      })
      .catch(() => toast.error(t("common.error")));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = () => {
    if (!name.trim()) return;
    start(async () => {
      try {
        const res = await fetch("/api/meds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, dose: dose || null }),
        });
        if (!res.ok) throw new Error("fail");
        setName("");
        setDose("");
        toast.success(t("common.success"));
        load();
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const take = (medicationId: string) => {
    start(async () => {
      try {
        const res = await fetch("/api/meds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "take", medicationId }),
        });
        if (!res.ok) throw new Error("fail");
        load();
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const nextHint =
    stats?.nextAction === "take_pending"
      ? locale === "en"
        ? `${stats.pendingCount} dose(s) left today`
        : `${stats.pendingCount} دوز مانده امروز`
      : stats?.nextAction === "all_done"
        ? locale === "en"
          ? "All doses taken — nice"
          : "همه دوزها زده شد"
        : locale === "en"
          ? "Add your first medication"
          : "اولین دارو را اضافه کن";

  return (
    <>
      <Header title={t("nav.meds")} />
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 motion-stagger">
        <PageHero
          heroKey="meds"
          title={t("nav.meds")}
          subtitle={
            locale === "en"
              ? "Medications & supplements with daily check-off"
              : "دارو و مکمل با یادآوری و تیک روزانه"
          }
        />

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <StatChip
              label={locale === "en" ? "Today" : "پایبندی امروز"}
              value={`${stats.adherenceToday}%`}
              hint={`${stats.takenToday}/${stats.expectedToday}`}
            />
            <StatChip
              label={locale === "en" ? "This week" : "این هفته"}
              value={`${stats.adherenceWeek}%`}
            />
            <StatChip
              label={locale === "en" ? "Next" : "اقدام بعدی"}
              value={String(stats.pendingCount)}
              hint={nextHint}
            />
          </div>
        )}

        <Card className="border-primary/15 overflow-hidden">
          <CardContent className="space-y-3 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{locale === "en" ? "Name" : "نام"}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{locale === "en" ? "Dose" : "دوز"}</Label>
                <Input value={dose} onChange={(e) => setDose(e.target.value)} />
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
            {!meds.length && (
              <p className="text-sm text-muted-foreground">
                {locale === "en" ? "No medications yet." : "هنوز دارویی ثبت نشده."}
              </p>
            )}
            {meds.map((m) => {
              const on = taken.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={on || pending}
                  onClick={() => take(m.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl border px-3 py-3 text-sm",
                    on ? "border-primary/40 bg-primary/8" : "hover:bg-muted/50"
                  )}
                >
                  <span>
                    <span className="font-medium">{m.name}</span>
                    {m.dose && (
                      <span className="text-muted-foreground ms-2 text-xs">{m.dose}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border",
                      on && "bg-primary text-primary-foreground border-primary"
                    )}
                  >
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
            <p className="text-xs text-muted-foreground pt-1">{nextHint}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "en" ? "History" : "تاریخچه"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {(stats?.history ?? []).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
              >
                <span>
                  {h.name} · <span dir="ltr">{h.date}</span>
                </span>
                <span className="text-muted-foreground">
                  {h.taken
                    ? locale === "en"
                      ? "taken"
                      : "زده شد"
                    : locale === "en"
                      ? "skipped"
                      : "نزده"}
                </span>
              </div>
            ))}
            {!stats?.history?.length && (
              <p className="text-sm text-muted-foreground">
                {locale === "en" ? "No history yet." : "هنوز سابقه‌ای نیست."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
