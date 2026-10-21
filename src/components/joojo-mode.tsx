"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Heart, Sparkles, ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useAppearance } from "@/components/appearance-provider";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

export function JoojoMascot({ className, pose = "wave", priority = false }: { className?: string; pose?: "wave" | "cozy"; priority?: boolean }) {
  return <Image src={`/joojo/${pose}.webp`} alt="جوجوی پاپیون‌صورتی" width={420} height={420} sizes="(max-width: 640px) 160px, 240px" priority={priority} className={cn("joojo-mascot object-contain", className)} />;
}

export function JoojoHero({ title, subtitle, action, className, heroKey }: { title: string; subtitle?: string; action?: ReactNode; className?: string; heroKey?: string }) {
  const { locale } = useLocale();
  return <section className={cn("joojo-hero", className)}>
    <div className="joojo-hero-copy">
      <span className="joojo-label"><Sparkles size={14} />{locale === "en" ? "A little joy, every day" : "یه ذره قشنگ‌تر، هر روز"}</span>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
      <div className="joojo-stickers" aria-hidden="true"><span>♡ قدم‌های کوچولو</span><span>✦ حال خوب</span><span>🎀 با جوجو</span></div>
    </div>
    <div className="joojo-mascot-stage" aria-hidden="true"><span className="joojo-orbit">✦</span><span className="joojo-heart">♡</span><JoojoMascot pose={heroKey && ["sleep", "selfcare", "journal", "mood", "cycle"].includes(heroKey) ? "cozy" : "wave"} priority /><span className="joojo-caption">hello, little sunshine!</span></div>
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
    <div className="joojo-mode-copy"><span className="joojo-label">{locale === "en" ? "A whole new little world" : "یه دنیای کوچولوی تازه"}</span><h3>{locale === "en" ? "JooJoo mode" : "جوجو مود"} <Heart size={20} /></h3><p>{locale === "en" ? "Meet your pink-bow companion. Sticker notebooks, candy buttons and a dreamy little world across the app." : "با جوجوی پاپیون‌صورتی: دفترچه‌های استیکری، دکمه‌های آبنباتی، منوی عروسکی و یه عالمه جزئیات بامزه در تمام برنامه."}</p><p>{locale === "en" ? "App logo, browser icon and new home-screen installs also use JooJoo." : "لوگوی برنامه، آیکون مرورگر و نصب جدید روی صفحهٔ اصلی هم جوجویی می‌شوند."}</p><button type="button" disabled={pending || !loaded} onClick={toggle} className="joojo-activate" aria-pressed={active}>{pending ? <LoaderCircle className="animate-spin" size={16} /> : active ? <Check size={16} /> : <Sparkles size={16} />}{locale === "en" ? (active ? "Leave JooJoo mode" : "Enter JooJoo world") : (active ? "خروج از جوجو مود" : "بریم تو دنیای جوجو")}</button></div>
  </div>;
}

export function JoojoHeaderBadge() {
  const { mood } = useAppearance();
  if (mood !== "joojo") return null;
  return <Link href="/settings#appearance" className="joojo-header-badge" title="تنظیمات و تغییر جوجو مود"><span aria-hidden="true">🎀</span><span className="hidden sm:inline">جوجو مود</span></Link>;
}
