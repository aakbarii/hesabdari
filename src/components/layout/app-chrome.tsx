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
import { JoojoPet } from "@/components/joojo-pet";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.includes(pathname) || pathname === "/install/joojo";
  const router = useRouter();
  const en = useLocale().locale === "en";
  const [retry, setRetry] = useState(0);
  const [session, setSession] = useState<"checking" | "in" | "out" | "error">("checking");

  // Every workspace page requires a signed-in account; otherwise send the visitor to login.
  useEffect(() => {
    if (isAuth) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => {
        if (r.status === 401) return { user: null };
        if (!r.ok) throw new Error("Session check failed");
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        if (d.user) {
          setSession("in");
        } else {
          setSession("out");
          router.replace("/login");
        }
      })
      .catch(() => {
        if (!cancelled) setSession("error");
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
  if (session !== "in") return null;

  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-background">
        <a href="#main-content" className="skip-link">رفتن به محتوای اصلی</a>
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
        <JoojoPet />
      </div>
    </ConfirmProvider>
  );
}
