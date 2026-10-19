"use client";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Moon } from "lucide-react";
import { toast } from "sonner";
import { toISODate } from "@/lib/format";
import { useLocale } from "@/components/locale-provider";

type Log = {
  id: string;
  date: string;
  hours: number | null;
  quality: number;
  energy: number;
};

export default function SleepPage() {
  const { t, locale } = useLocale();
  const [logs, setLogs] = useState<Log[]>([]);
  const [hours, setHours] = useState("7");
  const [quality, setQuality] = useState(4);
  const [energy, setEnergy] = useState(3);
  const [pending, start] = useTransition();
  const today = toISODate(new Date());

  const load = () =>
    fetch("/api/sleep")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
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

  return (
    <>
      <Header title={t("nav.sleep")} />
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 motion-stagger">
        <Card className="border-primary/15 overflow-hidden">
          <div className="p-5 bg-gradient-to-l from-indigo-500/15 via-violet-400/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{t("nav.sleep")}</h2>
                <p className="text-sm text-muted-foreground">
                  {locale === "en"
                    ? "Track sleep hours, quality and next-day energy"
                    : "ثبت ساعت خواب، کیفیت و انرژی روز بعد"}
                </p>
              </div>
            </div>
          </div>
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
            <Button disabled={pending} onClick={save}>
              {t("common.save")}
            </Button>
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
