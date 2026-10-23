"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Input } from "@/components/ui/input";
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
  const [query, setQuery] = useState("");
  const { navGroups } = useAppearance();
  const { t } = useLocale();
  const search = (value: string) => value.replace(/ي/g, "ی").replace(/ك/g, "ک").toLowerCase();
  const matches = navGroups.map(group => ({ ...group, items: group.items.filter(item => search(t(item.labelKey as MessageKey)).includes(search(query.trim()))) })).filter(group => group.items.length);
  const close = () => { setOpen(false); setQuery(""); };

  return (
    <Sheet open={open} onOpenChange={next => { setOpen(next); if (!next) setQuery(""); }}>
      <SheetTrigger className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-muted-foreground min-w-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-full">
          <Menu className="h-5 w-5" />
        </span>
        <span>{t("nav.more")}</span>
      </SheetTrigger>
      <SheetContent side="bottom" showCloseButton={false} className="data-[side=bottom]:h-[85dvh] max-h-[calc(100dvh-env(safe-area-inset-top)-1rem)] gap-0 overflow-hidden rounded-t-3xl">
        <SheetHeader className="shrink-0 flex-row items-center justify-between gap-3 border-b bg-popover p-4 text-right">
          <Button type="button" variant="outline" onClick={close} className="min-h-11 gap-2"><ArrowRight className="h-4 w-4" />{t("nav.more") === "More" ? "Back" : "برگشت"}</Button>
          <SheetTitle className="text-base">{t("nav.more")}</SheetTitle>
          <ThemeToggle />
          <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label="بستن منوی بیشتر" onClick={close}><X className="h-5 w-5" /></Button>
        </SheetHeader>
        <div className="shrink-0 border-b px-4 py-3"><Input aria-label="جستجو در بخش‌های برنامه" placeholder={t("nav.more") === "More" ? "Find a section…" : "کدوم بخش رو می‌خوای؟ جستجو کن…"} value={query} onChange={event => setQuery(event.target.value)} /></div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {!matches.length && <div className="space-y-3 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground"><p>بخشی با این نام پیدا نشد.</p><Button variant="outline" onClick={() => setQuery("")}>نمایش همهٔ بخش‌ها</Button></div>}
          {matches.map((group) => (
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
                      onClick={close}
                      className={cn(
                        "motion-soft flex min-h-14 min-w-0 items-center gap-2 rounded-2xl border p-3 text-sm",
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
