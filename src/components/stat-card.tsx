import { cn } from "@/lib/utils";

type Tone = "default" | "positive" | "negative" | "warning";

const toneClass: Record<Tone, string> = {
  default: "text-foreground",
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
};

/** Compact summary tile used at the top of list pages. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_oklch(0.2_0.02_165/0.04)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        ) : null}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular-nums", toneClass[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
