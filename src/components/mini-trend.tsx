"use client";

import { cn } from "@/lib/utils";

type Point = { label?: string; value: number };

/** Compact bar sparkline for module trend blocks */
export function MiniTrend({
  points,
  max,
  className,
  colorClass = "bg-primary",
}: {
  points: Point[];
  max?: number;
  className?: string;
  colorClass?: string;
}) {
  const peak = max ?? Math.max(1, ...points.map((p) => p.value));
  return (
    <div className={cn("flex items-end gap-1 h-16", className)}>
      {points.map((p, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full flex items-end h-12">
            <div
              className={cn("w-full rounded-t-sm transition-all", colorClass)}
              style={{ height: `${Math.max(6, Math.round((p.value / peak) * 100))}%` }}
              title={String(p.value)}
            />
          </div>
          {p.label ? (
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">
              {p.label}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function StatChip({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card/60 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums mt-0.5">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p> : null}
    </div>
  );
}
