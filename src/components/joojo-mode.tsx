"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Heart, Sparkles, ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useAppearance } from "@/components/appearance-provider";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { stellaForPage, stellaImage, type StellaVariant } from "@/lib/joojo-assets";
import { useJoojoReactiveMood } from "@/lib/joojo-reactive";
import { JoojoPet } from "@/components/joojo-pet";

export function JoojoMascot({ className, pose = "wave", priority = false, variant }: { className?: string; pose?: "wave" | "cozy"; priority?: boolean; variant?: StellaVariant }) {
  return <Image src={stellaImage(variant ?? (pose === "cozy" ? "dreamblast" : "classic"))} alt="جوجوی صورتی" width={420} height={420} sizes="(max-width: 640px) 160px, 240px" priority={priority} className={cn("joojo-mascot object-contain", className)} data-pose={pose} />;
}

export function JoojoHero({ title, subtitle, action, className, heroKey }: { title: string; subtitle?: string; action?: ReactNode; className?: string; heroKey?: string }) {
  return <section className={cn("joojo-hero", className)}>
    <div className="joojo-hero-copy">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
    </div>
    <div className="joojo-mascot-stage"><div className="joojo-static-mascot" aria-hidden="true"><JoojoMascot variant={stellaForPage(heroKey)} priority /></div><JoojoPet inline variant={stellaForPage(heroKey)} /></div>
  </section>;
}

export function JoojoSidebarNote() {
  const { mood } = useAppearance();
  const reactive = useJoojoReactiveMood();
  if (mood !== "joojo") return null;
  return (
    <div className="joojo-sidebar-note">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
        <Image
          src={reactive.image}
          alt="جوجو"
          width={40}
          height={40}
          className="h-full w-full object-contain p-0.5"
        />
      </div>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-xs font-bold text-foreground">{reactive.title}</strong>
        <p className="line-clamp-1 text-[11px] text-muted-foreground">{reactive.phrase}</p>
        <Link href="/selfcare" className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
          <span>{reactive.badge}</span>
          <ArrowLeft size={10} />
        </Link>
      </div>
    </div>
  );
}

export function JoojoModeCard() {
  const { mood, setMood, loaded } = useAppearance();
  const { locale } = useLocale();
  const [pending, setPending] = useState(false);
  const active = mood === "joojo";
  async function toggle() {
    setPending(true);
    try {
      await setMood(active ? "neutral" : "joojo");
      toast.success(active ? "به تم روال برگشتی" : "به دنیای جوجو خوش اومدی! 🎀");
    } catch { toast.error("تم ذخیره نشد؛ دوباره تلاش کن"); }
    finally { setPending(false); }
  }
  return <div className="joojo-mode-card" data-active={active}>
    <div className="joojo-mode-preview" aria-hidden="true"><span className="joojo-preview-star">✦</span><JoojoMascot className="h-36 w-36" /><span className="joojo-preview-bow">🎀</span></div>
    <div className="joojo-mode-copy"><span className="joojo-label">{locale === "en" ? "A whole new little world" : "یه دنیای کوچولوی تازه"}</span><h3>{locale === "en" ? "JooJoo mode" : "جوجو مود"} <Heart size={20} /></h3><p>{locale === "en" ? "Soft rose, quiet cards and a playful little companion." : "صورتی ملایم، کارت‌های خلوت و یک همراه کوچولوی زنده برای روزت."}</p><p>{locale === "en" ? "App logo, browser icon and new home-screen installs also use JooJoo." : "جوجو، آیکون پیش‌فرض برنامه و نصب روی موبایل است."}</p><button type="button" disabled={pending || !loaded} onClick={toggle} className="joojo-activate" aria-pressed={active}>{pending ? <LoaderCircle className="animate-spin" size={16} /> : active ? <Check size={16} /> : <Sparkles size={16} />}{locale === "en" ? (active ? "Leave JooJoo mode" : "Enter JooJoo world") : (active ? "خروج از جوجو مود" : "بریم تو دنیای جوجو")}</button></div>
    {active && <div className="basis-full text-sm leading-7"><a href="/install/joojo" className="font-bold underline underline-offset-4">{locale === "en" ? "Install with the JooJoo icon" : "نصب روی موبایل با آیکون جوجو 🎀"}</a><p>{locale === "en" ? "On iPhone, install again from this page to update an existing Home Screen icon." : "برای تغییر آیکون قبلی آیفون، از صفحهٔ نصب جوجو دوباره Add to Home Screen بزن."}</p></div>}
  </div>;
}

export function JoojoHeaderBadge() {
  const { mood } = useAppearance();
  if (mood !== "joojo") return null;
  return <Link href="/settings#appearance" className="joojo-header-badge" title="تنظیمات و تغییر جوجو مود"><span aria-hidden="true">🎀</span><span className="hidden sm:inline">جوجو مود</span></Link>;
}
