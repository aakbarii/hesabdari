"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  HandCoins,
  BarChart3,
  Target,
  Gem,
  Settings,
  Sunrise,
  Menu,
  Utensils,
  Dumbbell,
  Timer,
  BookOpen,
  Smile,
  Wrench,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppLogo } from "@/components/layout/app-logo";
import { useAppearance } from "@/components/appearance-provider";
import { useLocale } from "@/components/locale-provider";
import type { MessageKey } from "@/lib/i18n";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  "arrow-left-right": ArrowLeftRight,
  wallet: Wallet,
  target: Target,
  gem: Gem,
  "piggy-bank": PiggyBank,
  "hand-coins": HandCoins,
  "bar-chart-3": BarChart3,
  settings: Settings,
  sunrise: Sunrise,
  utensils: Utensils,
  dumbbell: Dumbbell,
  timer: Timer,
  "book-open": BookOpen,
  smile: Smile,
  wrench: Wrench,
  "heart-pulse": HeartPulse,
  sparkles: Sparkles,
  users: Users,
  moon: Moon,
  pill: Pill,
  plane: Plane,
  flame: Flame,
  inbox: Inbox,
};

export function MobileMoreNav() {
  const pathname = usePathname();
  const { navGroups } = useAppearance();
  const { t } = useLocale();

  return (
    <Sheet>
      <SheetTrigger className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium text-muted-foreground min-w-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-full">
          <Menu className="h-5 w-5" />
        </span>
        <span>{t("nav.more")}</span>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[75vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="flex flex-row items-center justify-between border-b pb-3 text-right">
          <AppLogo size="sm" subtitle={t("app.tagline")} />
          <SheetTitle className="sr-only">{t("nav.more")}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.titleKey}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {t(group.titleKey as MessageKey)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const Icon = iconMap[item.icon as keyof typeof iconMap];
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "motion-soft flex items-center gap-2 rounded-2xl border p-3 text-sm",
                        isActive && "border-primary bg-primary/5 text-primary shadow-sm"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {t(item.labelKey as MessageKey)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
