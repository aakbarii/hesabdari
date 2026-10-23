"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Sunrise,
  Utensils,
  Dumbbell,
  Wallet,
  Target,
  Gem,
  HandCoins,
  BarChart3,
  Timer,
  BookOpen,
  Smile,
  Wrench,
  Settings,
  HeartPulse,
  Sparkles,
  Users,
  Moon,
  Pill,
  Plane,
  Flame,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileMoreNav } from "@/components/layout/mobile-more-nav";
import { useAppearance } from "@/components/appearance-provider";
import { useLocale } from "@/components/locale-provider";
import type { MessageKey } from "@/lib/i18n";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  "arrow-left-right": ArrowLeftRight,
  "piggy-bank": PiggyBank,
  sunrise: Sunrise,
  utensils: Utensils,
  dumbbell: Dumbbell,
  wallet: Wallet,
  target: Target,
  gem: Gem,
  "hand-coins": HandCoins,
  "bar-chart-3": BarChart3,
  timer: Timer,
  "book-open": BookOpen,
  smile: Smile,
  wrench: Wrench,
  settings: Settings,
  "heart-pulse": HeartPulse,
  sparkles: Sparkles,
  users: Users,
  moon: Moon,
  pill: Pill,
  plane: Plane,
  flame: Flame,
  inbox: Inbox,
};

export function MobileNav() {
  const pathname = usePathname();
  const { mobilePrimary } = useAppearance();
  const { t, locale } = useLocale();
  const shortLabels: Record<string, string> = locale === "en" ? { "/life": "Today", "/transactions": "Activity" } : { "/life": "امروز", "/transactions": "تراکنش" };

  return (
    <nav
      aria-label="دسترسی سریع"
      className="app-mobile-nav lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/70 bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_-28px_oklch(0.2_0.05_160/0.35)]"
    >
      <div className="grid items-stretch gap-1 px-2 py-2" style={{ gridTemplateColumns: `repeat(${mobilePrimary.length + 1}, minmax(0, 1fr))` }}>
        {mobilePrimary.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={t(item.labelKey as MessageKey)}
              title={t(item.labelKey as MessageKey)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "motion-soft motion-press flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-medium min-w-0 transition-transform",
                isActive ? "text-primary font-bold scale-105" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  isActive && "bg-primary/15 text-primary shadow-xs"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="max-w-full truncate">{shortLabels[item.href] ?? t(item.labelKey as MessageKey)}</span>
            </Link>
          );
        })}
        <MobileMoreNav key={pathname} />
      </div>
    </nav>
  );
}
