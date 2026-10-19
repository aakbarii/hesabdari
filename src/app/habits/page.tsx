"use client";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, Check } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/layout/page-hero";

type Habit = {
  id: string;
  title: string;
  color: string;
  doneToday: boolean;
  streak: number;
};

export default function HabitsPage() {
  const { t, locale } = useLocale();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();

  const load = () =>
    fetch("/api/habits")
      .then((r) => r.json())
      .then((d) => setHabits(d.habits ?? []))
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
          body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error("fail");
        setTitle("");
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

  return (
    <>
      <Header title={t("nav.habits")} />
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 motion-stagger">
        <PageHero
          heroKey="habits"
          title={t("nav.habits")}
          subtitle={
            locale === "en"
              ? "Simple habits with streaks"
              : "عادت‌ساز ساده با استریک"
          }
        />
        <Card className="border-primary/15 overflow-hidden">
          <CardContent className="flex gap-2 pt-5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={locale === "en" ? "New habit" : "عادت جدید"}
            />
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
                  "w-full flex items-center justify-between rounded-xl border px-3 py-3 text-sm",
                  h.doneToday ? "border-primary/40 bg-primary/8" : "hover:bg-muted/50"
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: h.color }}
                  />
                  <span className="font-medium">{h.title}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {h.streak}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border",
                    h.doneToday && "bg-primary text-primary-foreground border-primary"
                  )}
                >
                  {h.doneToday && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
