"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Share, X } from "lucide-react";

const DISMISS_KEY = "hesabdari-ios-install-dismissed";

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return iOS;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari legacy
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PwaRegister() {
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (!isIos() || isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      return;
    }
    const t = window.setTimeout(() => setShowIosTip(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    setShowIosTip(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!showIosTip) return null;

  return (
    <div className="lg:hidden fixed inset-x-3 z-[60] bottom-[calc(5.5rem+env(safe-area-inset-bottom))] rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Share className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 text-sm">
          <p className="font-medium">نصب روی آیفون</p>
          <p className="text-muted-foreground leading-relaxed">
            در Safari دکمهٔ <span className="font-medium text-foreground">Share</span>{" "}
            را بزن، بعد{" "}
            <span className="font-medium text-foreground">Add to Home Screen</span>{" "}
            را انتخاب کن تا مثل اپ باز شود.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={dismiss}
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
