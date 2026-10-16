"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { RemindersBanner } from "@/components/layout/reminders-banner";
import { OnboardingDialog } from "@/components/onboarding/onboarding-dialog";
import { PageTransition } from "@/components/motion/page-transition";
import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { ConfirmProvider } from "@/components/confirm-dialog";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.includes(pathname);

  if (isAuth) {
    return (
      <main className="min-h-screen">
        <PageTransition>{children}</PageTransition>
      </main>
    );
  }
  
  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="app-shell lg:mr-64">
          <div className="hidden lg:flex h-14 items-center justify-end border-b px-8 motion-fade-in">
            <GlobalSearch />
          </div>
          <RemindersBanner />
          <OnboardingDialog />
          <main className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <QuickAddFab />
        <MobileNav />
      </div>
    </ConfirmProvider>
  );
}
