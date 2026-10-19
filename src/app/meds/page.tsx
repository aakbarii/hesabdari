"use client";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Check } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

type Med = {
  id: string;
  name: string;
  dose: string | null;
  schedule: string;
  reminderHour: number;
};

export default function MedsPage() {
  const { t, locale } = useLocale();
  const [meds, setMeds] = useState<Med[]>([]);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [pending, start] = useTransition();

  const load = () =>
    fetch("/api/meds")
      .then((r) => r.json())
      .then((d) => {
        setMeds(d.meds ?? []);
        setTaken(new Set((d.logsToday ?? []).map((l: { medicationId: string }) => l.medicationId)));
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

  return (
    <>
      <Header title={t("nav.meds")} />
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 motion-stagger">
        <Card className="border-primary/15 overflow-hidden">
          <div className="p-5 bg-gradient-to-l from-emerald-500/15 via-teal-400/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">{t("nav.meds")}</h2>
                <p className="text-sm text-muted-foreground">
                  {locale === "en"
                    ? "Medications & supplements with daily check-off"
                    : "دارو و مکمل با یادآوری و تیک روزانه"}
                </p>
              </div>
            </div>
          </div>
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
          </CardContent>
        </Card>
      </div>
    </>
  );
}
