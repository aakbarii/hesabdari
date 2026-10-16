"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Sunrise,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_NAV_PRIMARY } from "@/lib/constants";
import { MobileMoreNav } from "@/components/layout/mobile-more-nav";

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  "arrow-left-right": ArrowLeftRight,
  "piggy-bank": PiggyBank,
  sunrise: Sunrise,
};

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-2">
        {MOBILE_NAV_PRIMARY.map((item) => {
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
                "motion-soft motion-press flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium min-w-0",
                isActive ? "text-primary scale-105" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <MobileMoreNav />
      </div>
    </nav>
  );
}
