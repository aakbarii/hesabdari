"use client";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, CalendarHeart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { toISODate } from "@/lib/format";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n";

const SYMPTOMS = [
  { id: "cramps", fa: "گرفتگی", en: "Cramps" },
  { id: "bloating", fa: "نفخ", en: "Bloating" },
  { id: "headache", fa: "سردرد", en: "Headache" },
  { id: "fatigue", fa: "خستگی", en: "Fatigue" },
  { id: "mood", fa: "نوسان خلق", en: "Mood swings" },
  { id: "cravings", fa: "هوس غذایی", en: "Cravings" },
  { id: "back_pain", fa: "کمردرد", en: "Back pain" },
  { id: "acne", fa: "جوش", en: "Acne" },
];

type Entry = {
  id: string;
  date: string;
  kind: string;
  symptoms: string | null;
  notes: string | null;
};

export default function CyclePage() {
  const { t, locale } = useLocale();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [phase, setPhase] = useState("unknown");
  const [nextEstimate, setNextEstimate] = useState<string | null>(null);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const today = toISODate(new Date());

  const load = () => {
    fetch("/api/cycle")
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries ?? []);
        setPhase(d.phase ?? "unknown");
        setNextEstimate(d.nextEstimate ?? null);
        if (d.settings) {
          setCycleLength(d.settings.avgCycleLength ?? 28);
          setPeriodLength(d.settings.avgPeriodLength ?? 5);
        }
      })
      .catch(() => toast.error(t("common.error")));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const postEntry = (kind: "period_start" | "period_end" | "symptom") => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/cycle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: today,
            kind,
            symptoms: selectedSymptoms,
            notes: notes || null,
          }),
        });
        if (!res.ok) throw new Error("fail");
        toast.success(t("cycle.saved"));
        setNotes("");
        load();
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const saveSettings = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/cycle", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            avgCycleLength: cycleLength,
            avgPeriodLength: periodLength,
          }),
        });
        if (!res.ok) throw new Error("fail");
        toast.success(t("cycle.saved"));
        load();
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const phaseKey = `cycle.phase.${phase}` as MessageKey;

  return (
    <>
      <Header title={t("cycle.title")} />
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 motion-stagger">
        <Card className="overflow-hidden border-primary/20">
          <div className="bg-gradient-to-l from-rose-500/20 via-fuchsia-500/10 to-transparent p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{t("cycle.title")}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("cycle.subtitle")}
                </p>
              </div>
            </div>
          </div>
          <CardContent className="grid gap-3 sm:grid-cols-2 pt-5">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">{t("cycle.phase")}</p>
              <p className="font-semibold mt-1 text-lg">
                {t(phaseKey, t("cycle.phase.unknown"))}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarHeart className="h-3.5 w-3.5" />
                {t("cycle.nextEstimate")}
              </p>
              <p className="font-semibold mt-1 text-lg" dir="ltr">
                {nextEstimate ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("cycle.logPeriod")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button disabled={isPending} onClick={() => postEntry("period_start")}>
                {t("cycle.logPeriod")}
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => postEntry("period_end")}
              >
                {t("cycle.endPeriod")}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{t("cycle.symptoms")}</Label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map((s) => {
                  const on = selectedSymptoms.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setSelectedSymptoms((prev) =>
                          on ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors",
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {locale === "en" ? s.en : s.fa}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("cycle.notes")}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() => postEntry("symptom")}
            >
              <Sparkles className="h-4 w-4 me-2" />
              {t("common.save")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.appearance")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("cycle.cycleLength")}</Label>
              <Input
                type="number"
                value={cycleLength}
                onChange={(e) => setCycleLength(Number(e.target.value) || 28)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("cycle.periodLength")}</Label>
              <Input
                type="number"
                value={periodLength}
                onChange={(e) => setPeriodLength(Number(e.target.value) || 5)}
              />
            </div>
            <Button className="sm:col-span-2" onClick={saveSettings} disabled={isPending}>
              {t("common.save")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "en" ? "Recent logs" : "ثبت‌های اخیر"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!entries.length && (
              <p className="text-sm text-muted-foreground">{t("cycle.empty")}</p>
            )}
            {entries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium" dir="ltr">
                    {e.date}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.kind}</p>
                </div>
                <Badge variant="secondary">{e.kind.replace("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
