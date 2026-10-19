"use client";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Insight = {
  id: string;
  content: string;
  weekStart: string;
  suggestionsJson: string | null;
  source?: string;
};

type Automations = {
  anomalies: Array<{ categoryName: string; percentAbove: number }>;
  debtSuggestions: Array<{ suggestion: string; id: string }>;
  budgetSuggestions: Array<{ categoryName: string; amount: number }>;
  missedMeds: Array<{ name: string }>;
  missedHabits: Array<{ title: string }>;
  cycleSleepTip: string | null;
  geminiEnabled: boolean;
};

export default function InsightsPage() {
  const { t, locale } = useLocale();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [auto, setAuto] = useState<Automations | null>(null);
  const [pending, start] = useTransition();

  const load = () => {
    Promise.all([
      fetch("/api/insights").then((r) => r.json()),
      fetch("/api/automations").then((r) => r.json()),
    ])
      .then(([i, a]) => {
        setInsight(i.insight ?? null);
        setAuto(a);
      })
      .catch(() => toast.error(t("common.error")));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = () => {
    start(async () => {
      try {
        const res = await fetch("/api/insights", { method: "POST" });
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        setInsight(data.insight);
        toast.success(t("common.success"));
        load();
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const tips = (() => {
    try {
      return insight?.suggestionsJson
        ? (JSON.parse(insight.suggestionsJson) as {
            budgetTips?: string[];
            goalTips?: string[];
            source?: string;
          })
        : null;
    } catch {
      return null;
    }
  })();

  return (
    <>
      <Header title={locale === "en" ? "Smart insights" : "بینش هوشمند"} />
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 motion-stagger">
        <Card className="border-primary/15 overflow-hidden">
          <div className="p-5 bg-gradient-to-l from-violet-500/15 via-fuchsia-400/10 to-transparent">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">
                    {locale === "en" ? "Weekly summary" : "خلاصه هفتگی"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {locale === "en"
                      ? "Finance + mood via Gemini (or local fallback)"
                      : "مالی و حال با Gemini (یا نسخهٔ آفلاین)"}
                  </p>
                </div>
              </div>
              <Button disabled={pending} onClick={generate}>
                <RefreshCw className="h-4 w-4 me-1" />
                {locale === "en" ? "Generate" : "تولید خلاصه"}
              </Button>
            </div>
            {auto && (
              <Badge variant="secondary" className="mt-3">
                {auto.geminiEnabled ? "Gemini" : locale === "en" ? "Heuristic" : "ساده"}
              </Badge>
            )}
          </div>
          <CardContent className="space-y-4 pt-5">
            {insight ? (
              <>
                <p className="text-sm leading-7 whitespace-pre-wrap">{insight.content}</p>
                {tips?.budgetTips?.length ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {locale === "en" ? "Budget tips" : "پیشنهاد بودجه"}
                    </p>
                    <ul className="list-disc ps-5 text-sm space-y-1">
                      {tips.budgetTips.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {tips?.goalTips?.length ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {locale === "en" ? "Goal tips" : "پیشنهاد هدف"}
                    </p>
                    <ul className="list-disc ps-5 text-sm space-y-1">
                      {tips.goalTips.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {locale === "en"
                  ? "No insight yet — generate one."
                  : "هنوز خلاصه‌ای نیست — یک بار تولید کن."}
              </p>
            )}
          </CardContent>
        </Card>

        {auto && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {locale === "en" ? "Live automations" : "اتوماسیون‌های زنده"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {auto.cycleSleepTip && (
                  <p className="rounded-xl border border-rose-200/50 bg-rose-500/5 px-3 py-2">
                    {auto.cycleSleepTip}
                  </p>
                )}
                {auto.anomalies.slice(0, 3).map((a) => (
                  <p key={a.categoryName} className="text-muted-foreground">
                    ⚠ {a.categoryName}: +{a.percentAbove}%
                  </p>
                ))}
                {auto.debtSuggestions.slice(0, 3).map((d) => (
                  <p key={d.id}>
                    <Link href="/debts" className="text-primary hover:underline">
                      {d.suggestion}
                    </Link>
                  </p>
                ))}
                {auto.missedMeds.map((m) => (
                  <p key={m.name} className="text-muted-foreground">
                    💊 {m.name} — {locale === "en" ? "not logged today" : "امروز ثبت نشده"}
                  </p>
                ))}
                {auto.missedHabits.slice(0, 4).map((h) => (
                  <p key={h.title} className="text-muted-foreground">
                    🔥 {h.title}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link
                    href="/budget"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    {locale === "en" ? "Budgets" : "بودجه"}
                  </Link>
                  <Link
                    href="/assets"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    {locale === "en" ? "Assets sync" : "دارایی‌ها"}
                  </Link>
                  <Link
                    href="/life"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    {locale === "en" ? "Routines" : "روتین"}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
