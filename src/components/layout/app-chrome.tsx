"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { RemindersBanner } from "@/components/layout/reminders-banner";
import { OnboardingDialog } from "@/components/onboarding/onboarding-dialog";
import { PageTransition } from "@/components/motion/page-transition";
import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { isPublicPath, readSession } from "@/lib/client-session";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = isPublicPath(pathname);
  const router = useRouter();
  const en = useLocale().locale === "en";
  const [retry, setRetry] = useState(0);
  const [session, setSession] = useState<"checking" | "in" | "out" | "error">("checking");

  // Every workspace page requires a signed-in account; otherwise send the visitor to login.
  useEffect(() => {
    if (isAuth) return;
    let cancelled = false;
    readSession().then((state) => {
      if (cancelled) return;
      if (state === "in") setSession("in");
      else if (state === "error") setSession("error");
      else {
        setSession("out");
        router.replace("/login");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuth, router, retry]);

  if (isAuth) {
    return (
      <main className="min-h-screen">
        <PageTransition>{children}</PageTransition>
      </main>
    );
  }

  if (session === "error") return <main className="grid min-h-dvh place-items-center p-4">
    <div className="space-y-4 text-center">
      <p role="alert">{en ? "We couldn’t check your session." : "بررسی ورود انجام نشد."}</p>
      <Button onClick={() => { setSession("checking"); setRetry(value => value + 1); }}>
        {en ? "Try again" : "تلاش دوباره"}
      </Button>
    </div>
  </main>;
  if (session !== "in") return <main className="grid min-h-dvh place-items-center p-6 text-sm text-muted-foreground">{en ? "Taking you to sign in…" : "در حال رفتن به ورود…"}</main>;

  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-background">
        <a href="#main-content" className="skip-link">{en ? "Skip to content" : "رفتن به محتوای اصلی"}</a>
        <Sidebar />
        <div className="app-shell lg:ms-64 min-h-screen">
          <RemindersBanner />
          <OnboardingDialog />
          <main id="main-content" tabIndex={-1} className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <QuickAddFab />
        <MobileNav />
      </div>
    </ConfirmProvider>
  );
}
