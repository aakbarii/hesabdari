"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, X } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

const DISMISS_IOS = "hesabdari-ios-install-dismissed";
const DISMISS_ANDROID = "hesabdari-android-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PwaRegister() {
  const { t } = useLocale();
  const [showIosTip, setShowIosTip] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);

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
      if (localStorage.getItem(DISMISS_IOS) === "1") return;
    } catch {
      return;
    }
    const tmr = window.setTimeout(() => setShowIosTip(true), 1200);
    return () => window.clearTimeout(tmr);
  }, []);

  useEffect(() => {
    if (isIos() || isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_ANDROID) === "1") return;
    } catch {
      /* ignore */
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const dismissIos = () => {
    setShowIosTip(false);
    try {
      localStorage.setItem(DISMISS_IOS, "1");
    } catch {
      /* ignore */
    }
  };

  const dismissAndroid = () => {
    setShowAndroid(false);
    try {
      localStorage.setItem(DISMISS_ANDROID, "1");
    } catch {
      /* ignore */
    }
  };

  const installAndroid = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShowAndroid(false);
  };

  if (!showIosTip && !showAndroid) return null;

  return (
    <div className="lg:hidden fixed inset-x-3 z-[60] bottom-[calc(5.5rem+env(safe-area-inset-bottom))] space-y-2">
      {showAndroid && (
        <div className="rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Download className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              <p className="font-medium">{t("pwa.android.title")}</p>
              <p className="text-muted-foreground leading-relaxed">
                {t("pwa.android.body")}
              </p>
              <Button size="sm" onClick={installAndroid}>
                {t("pwa.android.install")}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={dismissAndroid}
              aria-label={t("common.cancel")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {showIosTip && (
        <div className="rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Share className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 text-sm">
              <p className="font-medium">{t("pwa.ios.title")}</p>
              <p className="text-muted-foreground leading-relaxed">
                {t("pwa.ios.body")}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={dismissIos}
              aria-label={t("common.cancel")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
