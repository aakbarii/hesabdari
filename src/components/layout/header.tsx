"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
const ModuleWorkbench = dynamic(() => import("@/components/module-workbench"), { ssr: false });

import { ThemeToggle } from "./theme-toggle";
import { GlobalSearch } from "./global-search";
import { AppLogo } from "./app-logo";
import { JoojoHeaderBadge } from "@/components/joojo-mode";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header({ title }: { title: string }) {
  const pathname = usePathname();
  return (
    <header className="app-header sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 px-4 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
        <div className="hidden sm:block"><JoojoHeaderBadge /></div>
        <div>
          <GlobalSearch />
        </div>
        <ModuleWorkbench key={pathname} module={pathname.split("/")[1] || "dashboard"} />
        <Button className="lg:hidden" size="icon" aria-label="ثبت سریع" title="ثبت سریع" onClick={() => window.dispatchEvent(new Event("ravaal:quick-add"))}><Plus className="h-5 w-5" /></Button>
        <div className="hidden sm:block"><ThemeToggle /></div>
      </div>
    </header>
  );
}
