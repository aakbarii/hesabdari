"use client";

import { ThemeToggle } from "./theme-toggle";
import { GlobalSearch } from "./global-search";

export function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 lg:h-16 items-center justify-between gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 lg:px-8 pt-[env(safe-area-inset-top)]">
      <h2 key={title} className="text-lg lg:text-xl font-semibold motion-fade-in truncate">
        {title}
      </h2>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="lg:hidden">
          <GlobalSearch />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
