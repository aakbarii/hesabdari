"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const [open, setOpen] = useState(false);
  const { navGroups } = useAppearance();
  const { t } = useLocale();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium text-muted-foreground min-w-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-full">
          <Menu className="h-5 w-5" />
        </span>
        <span>{t("nav.more")}</span>
      </SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false} className="data-[side=bottom]:h-[85dvh] max-h-[calc(100dvh-env(safe-area-inset-top)-1rem)] gap-0 overflow-hidden rounded-t-3xl">
        <SheetHeader className="shrink-0 flex-row items-center justify-between gap-3 border-b bg-popover p-4 text-right">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="min-h-11 gap-2"><ArrowRight className="h-4 w-4" />{t("nav.more") === "More" ? "Back" : "برگشت"}</Button>
          <SheetTitle className="text-base">{t("nav.more")}</SheetTitle>
          <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label="بستن منوی بیشتر" onClick={() => setOpen(false)}><X className="h-5 w-5" /></Button>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
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
                      onClick={() => setOpen(false)}
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
