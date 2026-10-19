"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, EyeOff, RotateCcw, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useHeroes } from "@/components/hero-provider";
import { useLocale } from "@/components/locale-provider";
import type { PageHeroKey } from "@/lib/page-heroes";
import { cn } from "@/lib/utils";

export function HeroCustomizeMenu({
  heroKey,
  className,
  light,
}: {
  heroKey: PageHeroKey;
  className?: string;
  /** For dark photo overlays (white-ish controls) */
  light?: boolean;
}) {
  const { locale } = useLocale();
  const { resolve, hide, reset, upload } = useHeroes();
  const resolved = resolve(heroKey);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const t = (fa: string, en: string) => (locale === "en" ? en : fa);

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          start(async () => {
            try {
              await upload(heroKey, file);
              toast.success(t("تصویر جایگزین شد", "Image replaced"));
              setMenuOpen(false);
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : t("خطا", "Error")
              );
            }
          });
        }}
      />
      <Button
        type="button"
        size="icon-sm"
        variant={light ? "secondary" : "secondary"}
        className={cn(
          "shadow-sm",
          light
            ? "bg-white/15 text-white hover:bg-white/25 border-white/20"
            : "bg-background/80 backdrop-blur-md"
        )}
        disabled={pending}
        aria-label={t("تنظیم تصویر", "Customize image")}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="close"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-10 end-0 z-40 min-w-44 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {t("جایگزینی عکس", "Replace photo")}
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted"
              onClick={() =>
                start(async () => {
                  try {
                    await hide(heroKey);
                    toast.success(t("تصویر برداشته شد", "Hero hidden"));
                    setMenuOpen(false);
                  } catch {
                    toast.error(t("خطا", "Error"));
                  }
                })
              }
            >
              <EyeOff className="h-4 w-4" />
              {t("برداشتن تصویر", "Remove image")}
            </button>
            {resolved.isCustom && (
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t px-3 py-2.5 text-sm hover:bg-muted"
                onClick={() =>
                  start(async () => {
                    try {
                      await reset(heroKey);
                      toast.success(t("بازگشت به پیش‌فرض", "Reset to default"));
                      setMenuOpen(false);
                    } catch {
                      toast.error(t("خطا", "Error"));
                    }
                  })
                }
              >
                <RotateCcw className="h-4 w-4" />
                {t("پیش‌فرض روال", "Ravaal default")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
