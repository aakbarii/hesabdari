"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  HandCoins,
  BarChart3,
  Calculator,
  Target,
  Gem,
  Settings,
  LogOut,
  Sunrise,
  Utensils,
  Dumbbell,
  Timer,
  BookOpen,
  Smile,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/layout/app-logo";

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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserName(d.user?.name ?? ""));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:right-0 border-l bg-card motion-slide-in-right">
      <div className="flex h-16 items-center px-5 border-b">
        <AppLogo size="md" subtitle="سامانه جامع زندگی و مالی" />
      </div>
      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </p>
            <div className="space-y-1">
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
                      "motion-soft motion-press flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-4 border-t space-y-2">
        {userName && (
          <p className="text-xs text-muted-foreground px-3 truncate">{userName}</p>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          خروج
        </Button>
      </div>
    </aside>
  );
}
