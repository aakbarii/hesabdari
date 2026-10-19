"use client";

import { ThemeToggle } from "./theme-toggle";
import { GlobalSearch } from "./global-search";
import { AppLogo } from "./app-logo";

export function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 lg:h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 px-4 lg:px-8 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2.5 truncate">
        <div className="lg:hidden shrink-0">
          <AppLogo size="sm" showText={false} />
        </div>
        <div className="min-w-0">
          <p className="hidden sm:block text-[10px] font-medium tracking-wide text-muted-foreground/80 mb-0.5">
            روال
          </p>
          <h1 key={title} className="text-lg lg:text-xl font-bold motion-fade-in truncate leading-tight">
            {title}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div>
          <GlobalSearch />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
