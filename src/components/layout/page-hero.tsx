"use client";

import { cn } from "@/lib/utils";
import type { PageHeroKey } from "@/lib/page-heroes";

type PageHeroProps = {
  /** Kept for call-site compatibility; the header no longer shows photo banners. */
  heroKey?: PageHeroKey;
  image?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
  customizable?: boolean;
};

export function PageHero({ title, subtitle, action, className }: PageHeroProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h2 className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{title}</h2>
        {subtitle ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
