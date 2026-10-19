"use client";

import { useTransition } from "react";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useHeroes } from "@/components/hero-provider";
import { PAGE_HEROES, type PageHeroKey } from "@/lib/page-heroes";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { HeroCustomizeMenu } from "@/components/layout/hero-customize-menu";

type PageHeroProps = {
  heroKey: PageHeroKey;
  /** @deprecated fallback while migrating */
  image?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
  customizable?: boolean;
};

export function PageHero({
  heroKey,
  image,
  title,
  subtitle,
  action,
  className,
  compact,
  customizable = true,
}: PageHeroProps) {
  const { locale } = useLocale();
  const { resolve, show, loaded } = useHeroes();
  const resolved = resolve(heroKey);
  const fallback = image ?? PAGE_HEROES[heroKey];
  const src = loaded ? resolved.src : fallback;
  const hidden = loaded && resolved.hidden;
  const [pending, start] = useTransition();
  const t = (fa: string, en: string) => (locale === "en" ? en : fa);

  if (hidden) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-3",
          className
        )}
      >
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{title}</p>
          {subtitle ? (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {action}
          {customizable && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  try {
                    await show(heroKey);
                    toast.success(t("تصویر نمایش داده شد", "Hero shown"));
                  } catch {
                    toast.error(t("خطا", "Error"));
                  }
                })
              }
            >
              <ImageIcon className="h-3.5 w-3.5 me-1" />
              {t("نمایش تصویر", "Show image")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/50 shadow-sm",
        compact ? "min-h-[120px]" : "min-h-[148px] sm:min-h-[168px]",
        className
      )}
    >
      {src.startsWith("/api/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <Image
          src={src}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 960px"
          className="object-cover object-center"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/25 dark:from-background dark:via-background/80 dark:to-background/30" />
      <div className="absolute inset-0 bg-gradient-to-l from-background/40 via-transparent to-transparent" />

      {customizable && (
        <HeroCustomizeMenu
          heroKey={heroKey}
          className="absolute top-3 end-3 z-20"
        />
      )}

      <div
        className={cn(
          "relative z-10 flex h-full flex-col justify-end gap-3 p-5 sm:flex-row sm:items-end sm:justify-between",
          compact ? "p-4" : "sm:p-6"
        )}
      >
        <div className="min-w-0 space-y-1 pe-10">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground drop-shadow-sm">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
