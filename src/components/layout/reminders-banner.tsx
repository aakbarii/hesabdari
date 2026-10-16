"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, X } from "lucide-react";
import { formatToman } from "@/lib/format";

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
}

export function RemindersBanner() {
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
    (data.todoAlerts?.length ?? 0);
  if (total === 0) return null;

  return (
    <div className="border-b bg-amber-500/10 px-4 py-3 lg:px-8 motion-fade-in">
      <div className="flex items-start gap-3">
        <Bell className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            {total} یادآور
          </p>
          {data.budgetAlerts.slice(0, 2).map((b) => (
            <p key={b.id} className="text-muted-foreground">
              <Link href="/budget" className="hover:underline">
                بودجه {b.categoryName}: {b.percent}%
                {b.level === "exceeded" ? " (رد شده!)" : ""}
              </Link>
            </p>
          ))}
          {data.debtAlerts.slice(0, 2).map((d) => (
            <p key={d.id} className="text-muted-foreground flex items-center gap-1">
              {d.level === "overdue" && (
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              )}
              <Link href="/debts" className="hover:underline">
                {d.type === "owed" ? "طلب" : "بدهی"} {d.personName}:{" "}
                {formatToman(d.remaining)}
                {d.level === "overdue" ? " (سررسید گذشته)" : " (نزدیک سررسید)"}
              </Link>
            </p>
          ))}
          {data.todoAlerts?.slice(0, 2).map((t) => (
            <p key={t.id} className="text-muted-foreground flex items-center gap-1">
              {t.level === "overdue" && (
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              )}
              <Link href="/life" className="hover:underline">
                کار: {t.title}
                {t.level === "overdue" ? " (عقب‌افتاده)" : " (امروز)"}
              </Link>
            </p>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
