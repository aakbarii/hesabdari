"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
const ModuleWorkbench = dynamic(() => import("@/components/module-workbench"), { ssr: false });

import { ThemeToggle } from "./theme-toggle";
import { GlobalSearch } from "./global-search";
import { AppLogo } from "./app-logo";
import { JoojoHeaderBadge } from "@/components/joojo-mode";

export function Header({ title }: { title: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 flex h-14 lg:h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 px-4 lg:px-8 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2.5 truncate">
        <div className="lg:hidden shrink-0">
          <AppLogo size="sm" showText={false} />
        </div>
        <div className="min-w-0">
          <p className="hidden sm:block text-[11px] font-medium text-muted-foreground mb-0.5">
            روال
          </p>
          <h1 key={title} className="text-base font-semibold tracking-tight motion-fade-in truncate leading-tight lg:text-lg">
            {title}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <JoojoHeaderBadge />
        <div>
          <GlobalSearch />
        </div>
        <ModuleWorkbench key={pathname} module={pathname.split("/")[1] || "dashboard"} />
        <ThemeToggle />
      </div>
    </header>
  );
}
