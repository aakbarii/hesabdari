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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/lib/constants";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
};

export function MobileMoreNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        className="flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted-foreground min-w-0"
      >
        <Menu className="h-5 w-5" />
        <span>بیشتر</span>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>منوی کامل</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {group.title}
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
                        "flex items-center gap-2 rounded-xl border p-3 text-sm",
                        isActive && "border-primary bg-primary/5 text-primary"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
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
