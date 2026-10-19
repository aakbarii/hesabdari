"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { toISODate } from "@/lib/format";

const ITEMS = [
  { id: "cleanser", fa: "پاک‌سازی پوست", en: "Cleanse skin" },
  { id: "moisturizer", fa: "مرطوب‌کننده", en: "Moisturizer" },
  { id: "sunscreen", fa: "ضدآفتاب", en: "Sunscreen" },
  { id: "hair", fa: "مراقبت مو", en: "Hair care" },
  { id: "water", fa: "آب کافی", en: "Drink water" },
  { id: "stretch", fa: "کشش ملایم", en: "Gentle stretch" },
  { id: "journal", fa: "۵ دقیقه ژورنال", en: "5‑min journal" },
  { id: "screen", fa: "استراحت از صفحه", en: "Screen break" },
  { id: "tea", fa: "چای / آرامش", en: "Tea & calm" },
  { id: "sleep", fa: "آماده خواب", en: "Wind down for sleep" },
];

function storageKey(day: string) {
  return `ravaal-selfcare-${day}`;
}

export default function SelfCarePage() {
  const { t, locale } = useLocale();
  const today = toISODate(new Date());
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(today));
      if (raw) setDone(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [today]);

  const persist = (next: string[]) => {
    setDone(next);
    try {
      localStorage.setItem(storageKey(today), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const progress = useMemo(
    () => Math.round((done.length / ITEMS.length) * 100),
    [done.length]
  );

  return (
    <>
      <Header title={t("selfcare.title")} />
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 motion-stagger">
        <Card className="border-primary/15 overflow-hidden">
          <div className="p-5 bg-gradient-to-l from-pink-500/15 via-rose-400/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{t("selfcare.title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("selfcare.subtitle")}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2" dir="ltr">
              {done.length}/{ITEMS.length} · {progress}%
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">{t("selfcare.done")}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => persist([])}
            >
              {t("selfcare.resetDay")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {ITEMS.map((item) => {
              const on = done.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    persist(
                      on
                        ? done.filter((x) => x !== item.id)
                        : [...done, item.id]
                    )
                  }
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl border px-3 py-3 text-sm transition-colors",
                    on
                      ? "border-primary/40 bg-primary/8"
                      : "hover:bg-muted/50"
                  )}
                >
                  <span>{locale === "en" ? item.en : item.fa}</span>
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border",
                      on && "border-primary bg-primary text-primary-foreground"
                    )}
                  >
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
