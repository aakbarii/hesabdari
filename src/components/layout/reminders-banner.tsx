"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, X } from "lucide-react";
import { formatToman } from "@/lib/format";
import { useLocale } from "@/components/locale-provider";

interface Reminders {
  budgetAlerts: Array<{
    id: string;
    categoryName: string;
    spent: number;
    amount: number;
    percent: number;
    level: string;
  }>;
  debtAlerts: Array<{
    id: string;
    personName: string;
    type: string;
    remaining: number;
    level: string;
  }>;
  todoAlerts?: Array<{
    id: string;
    title: string;
    level: string;
  }>;
  cycleAlerts?: Array<{ id: string; message: string; level: string; href: string }>;
  maintenanceAlerts?: Array<{ id: string; message: string; level: string; href: string }>;
  medAlerts?: Array<{ id: string; message: string; level: string; href: string }>;
  anomalyAlerts?: Array<{ id: string; message: string; level: string; href: string }>;
  debtTips?: Array<{ id: string; message: string; level: string; href: string }>;
}

export function RemindersBanner() {
  const { t, locale } = useLocale();
  const [data, setData] = useState<Reminders | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/reminders")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, []);

  if (dismissed || !data) return null;
  const total =
    data.budgetAlerts.length +
    data.debtAlerts.length +
    (data.todoAlerts?.length ?? 0) +
    (data.cycleAlerts?.length ?? 0) +
    (data.maintenanceAlerts?.length ?? 0) +
    (data.medAlerts?.length ?? 0) +
    (data.anomalyAlerts?.length ?? 0) +
    (data.debtTips?.length ?? 0);
  if (total === 0) return null;

  return (
    <div className="border-b bg-amber-500/10 px-4 py-3 lg:px-8 motion-fade-in">
      <div className="flex items-start gap-3">
        <Bell className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            {total} {locale === "en" ? "reminders" : "یادآور"}
          </p>
          {data.budgetAlerts.slice(0, 2).map((b) => (
            <p key={b.id} className="text-muted-foreground">
              <Link href="/budget" className="hover:underline">
                {locale === "en" ? "Budget" : "بودجه"} {b.categoryName}: {b.percent}%
                {b.level === "exceeded"
                  ? locale === "en"
                    ? " (over!)"
                    : " (رد شده!)"
                  : ""}
              </Link>
            </p>
          ))}
          {data.debtAlerts.slice(0, 2).map((d) => (
            <p key={d.id} className="text-muted-foreground flex items-center gap-1">
              {d.level === "overdue" && (
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              )}
              <Link href="/debts" className="hover:underline">
                {d.type === "owed"
                  ? locale === "en"
                    ? "Receivable"
                    : "طلب"
                  : locale === "en"
                    ? "Debt"
                    : "بدهی"}{" "}
                {d.personName}: {formatToman(d.remaining)}
              </Link>
            </p>
          ))}
          {data.todoAlerts?.slice(0, 2).map((item) => (
            <p key={item.id} className="text-muted-foreground flex items-center gap-1">
              {item.level === "overdue" && (
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              )}
              <Link href="/life" className="hover:underline">
                {locale === "en" ? "Task" : "کار"}: {item.title}
              </Link>
            </p>
          ))}
          {data.cycleAlerts?.slice(0, 1).map((c) => (
            <p key={c.id} className="text-muted-foreground">
              <Link href={c.href} className="hover:underline">
                {c.message}
              </Link>
            </p>
          ))}
          {data.maintenanceAlerts?.slice(0, 1).map((m) => (
            <p key={m.id} className="text-muted-foreground">
              <Link href={m.href} className="hover:underline">
                {m.message}
              </Link>
            </p>
          ))}
          {data.medAlerts?.slice(0, 2).map((m) => (
            <p key={m.id} className="text-muted-foreground">
              <Link href={m.href} className="hover:underline">
                {m.message}
              </Link>
            </p>
          ))}
          {data.anomalyAlerts?.slice(0, 2).map((a) => (
            <p key={a.id} className="text-muted-foreground">
              <Link href={a.href} className="hover:underline">
                {a.message}
              </Link>
            </p>
          ))}
          {data.debtTips?.slice(0, 1).map((d) => (
            <p key={d.id} className="text-muted-foreground">
              <Link href={d.href} className="hover:underline">
                {d.message}
              </Link>
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t("common.cancel")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
