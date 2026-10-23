"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
const ModuleWorkbench = dynamic(() => import("@/components/module-workbench"), { ssr: false });

import { ThemeToggle } from "./theme-toggle";
import { GlobalSearch } from "./global-search";
import { AppLogo } from "./app-logo";
import { JoojoHeaderBadge } from "@/components/joojo-mode";
import { WorkflowGuide } from "./workflow-guide";
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
        <div className="flex min-w-0 items-center gap-1">
          <p className="hidden">
            روال
          </p>
          <h1 key={title} className="text-base font-semibold tracking-tight motion-fade-in truncate leading-tight lg:text-lg">
            {title}
          </h1>
          <WorkflowGuide module={pathname.split("/")[1] || "dashboard"} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="hidden sm:block"><JoojoHeaderBadge /></div>
        <div>
          <GlobalSearch />
        </div>
        <ModuleWorkbench key={pathname} module={pathname.split("/")[1] || "dashboard"} />
        {pathname !== "/transactions" && <Button className="lg:hidden" size="icon" aria-label="ثبت سریع" title="ثبت سریع" onClick={() => window.dispatchEvent(new Event("ravaal:quick-add"))}><Plus className="h-5 w-5" /></Button>}
        <div className="hidden sm:block"><ThemeToggle /></div>
      </div>
    </header>
  );
}
