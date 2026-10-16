"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TODO_AREAS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
} from "lucide-react";

interface WeekTodo {
  id: string;
  title: string;
  area: keyof typeof TODO_AREAS;
  status: "active" | "done";
}

interface WeekDay {
  date: string;
  weekday: string;
  jalali: string;
  isToday: boolean;
  isFuture: boolean;
  done: WeekTodo[];
  planned: WeekTodo[];
}

interface WeekData {
  weekLabel: string;
  offsetWeeks: number;
  doneCount: number;
  plannedCount: number;
  days: WeekDay[];
}

export function TodoWeekView({ onBack }: { onBack: () => void }) {
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/todos/week?offset=${offset}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [offset]);

  return (
    <div className="space-y-4 motion-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowRight className="h-4 w-4" />
          بازگشت به کارها
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setOffset((o) => o - 1)}
            aria-label="هفته قبل"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOffset(0)}
            disabled={offset === 0}
          >
            این هفته
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setOffset((o) => o + 1)}
            disabled={offset >= 0}
            aria-label="هفته بعد"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="font-semibold text-lg">تقویم هفته</h3>
        <p className="text-sm text-muted-foreground">
          {data?.weekLabel ?? "..."}
        </p>
        {data && (
          <p className="text-xs text-muted-foreground">
            {data.doneCount} انجام‌شده · {data.plannedCount} برنامه‌ریزی‌شده
          </p>
        )}
      </div>

      {loading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="h-32 motion-skeleton rounded-lg m-3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {data.days.map((day) => (
            <Card
              key={day.date}
              className={cn(
                "min-h-[140px]",
                day.isToday && "ring-2 ring-primary/40 bg-primary/5"
              )}
            >
              <CardContent className="pt-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-semibold">{day.weekday}</p>
                    {day.isToday && (
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        امروز
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {day.jalali}
                  </p>
                </div>

                {day.done.length === 0 && day.planned.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/70 py-2">
                    {day.isFuture ? "—" : "بدون کار"}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {day.done.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-start gap-1.5 text-xs leading-snug"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="line-through text-muted-foreground">
                          {t.title}
                        </span>
                      </li>
                    ))}
                    {day.planned.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-start gap-1.5 text-xs leading-snug"
                      >
                        {t.status === "done" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <span
                          className={cn(
                            t.status === "done" &&
                              "line-through text-muted-foreground"
                          )}
                          style={{
                            borderRight: `2px solid ${TODO_AREAS[t.area]?.color ?? "#888"}`,
                            paddingRight: 6,
                          }}
                        >
                          {t.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
