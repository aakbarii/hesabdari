"use client";
import { useRecordsRefresh } from "@/components/use-records-refresh";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { toISODate, formatToman } from "@/lib/format";
import { useLocale } from "@/components/locale-provider";

type Trip = {
  id: string;
  title: string;
  place: string | null;
  startDate: string;
  budget: number;
};
type Expense = { id: string; tripId: string; title: string; amount: number; date: string };

export default function TravelPage() {
  useRecordsRefresh(() => { void load(); });
  const { t, locale } = useLocale();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [budget, setBudget] = useState("0");
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [pending, start] = useTransition();
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [txAccountId, setTxAccountId] = useState("");
  const today = toISODate(new Date());

  const load = () =>
    fetch("/api/travel")
      .then((r) => r.json())
      .then((d) => {
        setTrips(d.trips ?? []);
        setExpenses(d.expenses ?? []);
        if (!active && d.trips?.[0]) setActive(d.trips[0].id);
      })
      .catch(() => toast.error(t("common.error")));

  useEffect(() => {
    load();
    fetch("/api/accounts")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const list = Array.isArray(d) ? d : d.accounts ?? [];
        setAccounts(list);
        if (list[0]) setTxAccountId(list[0].id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toTransaction = (expenseId: string) => {
    if (!txAccountId) {
      toast.error(locale === "en" ? "Pick an account" : "حساب را انتخاب کن");
      return;
    }
    start(async () => {
      try {
        const res = await fetch("/api/travel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "to-transaction",
            expenseId,
            accountId: txAccountId,
          }),
        });
        if (!res.ok) throw new Error("fail");
        toast.success(
          locale === "en" ? "Logged as transaction" : "به‌عنوان تراکنش ثبت شد"
        );
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const spent = useMemo(
    () =>
      expenses
        .filter((e) => e.tripId === active)
        .reduce((s, e) => s + e.amount, 0),
    [expenses, active]
  );
  const trip = trips.find((x) => x.id === active);

  const createTrip = () => {
    if (!title.trim()) return;
    start(async () => {
      try {
        const res = await fetch("/api/travel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            place: place || null,
            startDate: today,
            budget: Number(budget) || 0,
          }),
        });
        if (!res.ok) throw new Error("fail");
        setTitle("");
        setPlace("");
        toast.success(t("common.success"));
        load();
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const addExpense = () => {
    if (!active || !expTitle.trim()) return;
    start(async () => {
      try {
        const res = await fetch("/api/travel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "expense",
            tripId: active,
            title: expTitle,
            amount: Number(expAmount) || 0,
            date: today,
          }),
        });
        if (!res.ok) throw new Error("fail");
        setExpTitle("");
        setExpAmount("");
        load();
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  return (
    <>
      <Header title={t("nav.travel")} />
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 motion-stagger">
        <PageHero
          heroKey="travel"
          title={t("nav.travel")}
          subtitle={
            locale === "en"
              ? "Trips and travel spending vs budget"
              : "سفرها و هزینهٔ سفر در برابر بودجه"
          }
        />
        <Card className="border-primary/15 overflow-hidden">
          <CardContent className="grid gap-3 sm:grid-cols-3 pt-5">
            <div className="space-y-2 sm:col-span-1">
              <Label>{locale === "en" ? "Trip" : "سفر"}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{locale === "en" ? "Place" : "مقصد"}</Label>
              <Input value={place} onChange={(e) => setPlace(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{locale === "en" ? "Budget" : "بودجه"}</Label>
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" />
            </div>
            <Button className="sm:col-span-3" disabled={pending} onClick={createTrip}>
              {t("common.add")}
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {trips.map((tr) => (
            <button
              key={tr.id}
              type="button"
              onClick={() => setActive(tr.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                active === tr.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
            >
              {tr.title}
            </button>
          ))}
        </div>

        {trip && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {trip.title}
                {trip.place ? ` · ${trip.place}` : ""}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatToman(spent)} / {formatToman(trip.budget)}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder={locale === "en" ? "Expense" : "هزینه"}
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                />
                <Input
                  placeholder={locale === "en" ? "Amount" : "مبلغ"}
                  type="number"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                />
              </div>
              <Button disabled={pending} onClick={addExpense}>
                {t("common.add")}
              </Button>
              {accounts.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">
                    {locale === "en"
                      ? "Account for ledger"
                      : "حساب برای ثبت در دفتر"}
                  </Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={txAccountId}
                    onChange={(e) => setTxAccountId(e.target.value)}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                {expenses
                  .filter((e) => e.tripId === trip.id)
                  .map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">{e.title}</span>
                      <span className="shrink-0 flex items-center gap-2">
                        <span>{formatToman(e.amount)}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending || !txAccountId}
                          onClick={() => toTransaction(e.id)}
                        >
                          {locale === "en" ? "To ledger" : "ثبت تراکنش"}
                        </Button>
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
