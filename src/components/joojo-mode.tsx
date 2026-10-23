"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Heart, Sparkles, ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useAppearance } from "@/components/appearance-provider";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { JoojoPet } from "@/components/joojo-pet";

export function JoojoMascot({ className, pose = "wave", priority = false }: { className?: string; pose?: "wave" | "cozy"; priority?: boolean }) {
  return <Image src="/joojo/pink-mascot.webp" alt="جوجوی صورتی" width={420} height={420} sizes="(max-width: 640px) 160px, 240px" priority={priority} className={cn("joojo-mascot object-contain", className)} data-pose={pose} />;
}

export function JoojoHero({ title, subtitle, action, className, heroKey }: { title: string; subtitle?: string; action?: ReactNode; className?: string; heroKey?: string }) {
  return <section className={cn("joojo-hero", className)}>
    <div className="joojo-hero-copy">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
    </div>
    <div className="joojo-mascot-stage"><div className="joojo-static-mascot" aria-hidden="true"><JoojoMascot pose={heroKey && ["sleep", "selfcare", "journal", "mood", "cycle"].includes(heroKey) ? "cozy" : "wave"} priority /></div><JoojoPet inline /></div>
  </section>;
}

export function JoojoSidebarNote() {
  const { mood } = useAppearance();
  if (mood !== "joojo") return null;
  return <div className="joojo-sidebar-note"><JoojoMascot pose="cozy" className="h-24 w-24" /><div><strong>جوجو کنارته ♡</strong><p>هر قدم کوچیکت ارزشمنده.</p><Link href="/selfcare">یه کم مراقب خودت باش <ArrowLeft size={12} /></Link></div></div>;
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
