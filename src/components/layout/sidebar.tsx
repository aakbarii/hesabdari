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
  ShieldCheck,
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
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/layout/app-logo";

import { AUTH_ENABLED } from "@/lib/app-config";
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { navGroups } = useAppearance();
  const { t } = useLocale();
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUserName(d.user?.name ?? "");
        setIsAdmin(Boolean(d.user?.isAdmin));
      })
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:right-0 border-l border-border/70 bg-sidebar">
      <div className="flex h-16 items-center px-5 border-b border-border/70">
        <AppLogo size="md" />
      </div>
      <nav aria-label="منوی اصلی" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">

        {navGroups.map((group) => (
          <details key={`${group.titleKey}:${pathname}`} open={group.items.some(item => item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) || group.titleKey === "nav.group.overview"}>
            <summary className="mb-1.5 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
              {t(group.titleKey as MessageKey)}
            </summary>
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
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {t(item.labelKey as MessageKey)}
                  </Link>
                );
              })}
            </div>
          </details>
        ))}
      </nav>
      <div className="p-4 border-t space-y-2">
        {userName && (
          <p className="text-xs text-muted-foreground px-3 truncate">{userName}</p>
        )}
        {isAdmin && (
          <Link
            href="/sanjabadmin"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ShieldCheck className="h-5 w-5" />
            پنل مدیریت
          </Link>
        )}
        {/* Login/logout temporarily disabled; restore with AUTH_ENABLED. */}
        {AUTH_ENABLED && <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          خروج
        </Button>}
      </div>
    </aside>
  );
}
