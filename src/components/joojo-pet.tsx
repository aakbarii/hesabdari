"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { stellaImage, stellaForPage, type StellaVariant } from "@/lib/joojo-assets";
import { useJoojoReactiveMood } from "@/lib/joojo-reactive";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Heart, Wheat, Moon, Pause, Play, Volume2, VolumeX, Sparkles, Music2, X } from "lucide-react";
import { useAppearance } from "@/components/appearance-provider";
import "./joojo-pet.css";

type Action = "idle" | "walk" | "eat" | "sneeze" | "sleep" | "love" | "jump" | "dance";
type Preferences = { paused: boolean; sound: boolean };
const PREF_KEY = "ravaal:joojo-pet:v1";
const DURATIONS: Record<Action, number> = { idle: 12000, walk: 5200, eat: 4200, sneeze: 2000, sleep: 10000, love: 2800, jump: 2400, dance: 3600 };
const PHRASES: Record<Action, string> = { idle: "من اینجام! 🎀", walk: "یه دور کوچولو بزنم…", eat: "جیک جیک! مرسی برای دونا 🌾", sneeze: "هاپچی! ✨", sleep: "یه چرت زیر پتو… zZz", love: "دوستت دارم! ♡", jump: "یه پرش کوچولو! ✨", dance: "جیک‌جیک، وقت رقصه! ♫" };

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}
function subscribeCompact(callback: () => void) {
  const query = window.matchMedia("(max-width: 1023px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(PREF_KEY) ?? "null");
    // Sound always starts muted. Enabling it requires a gesture in this tab.
    return { paused: saved?.paused === true, sound: false };
  } catch { return { paused: false, sound: false }; }
}

function LivingJoojo({ inline, variant }: { inline: boolean; variant: StellaVariant }) {
  const size = inline ? 82 : 112;
  const reactive = useJoojoReactiveMood();
  const [preferences, setPreferences] = useState(readPreferences);
  const [action, setAction] = useState<Action>("idle");
  const [menu, setMenu] = useState(false);
  const [x, setX] = useState(0);
  const [facing, setFacing] = useState(1);
  const lane = useRef<HTMLDivElement>(null);
  const traveler = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const menuId = useId();
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const [inView, setInView] = useState(true);
  const pageVisible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => false);

  const visible = pageVisible && inView;

  function updatePreferences(next: Partial<Preferences>) {
    const updated = { ...preferences, ...next };
    setPreferences(updated);
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ paused: updated.paused })); } catch { /* Optional device preference. */ }
  }

  function chirp() {
    const ctx = audio.current;
    if (!preferences.sound || !ctx || ctx.state !== "running") return;
    try {
      const now = ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * .16;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(1500, start);
        oscillator.frequency.exponentialRampToValueAtTime(2400, start + .045);
        oscillator.frequency.exponentialRampToValueAtTime(1700, start + .11);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(.025, start + .012);
        gain.gain.exponentialRampToValueAtTime(.001, start + .12);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start);
        oscillator.stop(start + .13);
      }
    } catch { /* Audio is decorative and must never interrupt the app. */ }
  }

  async function toggleSound() {
    if (preferences.sound) { updatePreferences({ sound: false }); return; }
    try {
      const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) return;
      audio.current ??= new Audio();
      await audio.current.resume();
      updatePreferences({ sound: audio.current.state === "running" });
    } catch { updatePreferences({ sound: false }); }
  }

  function settle() {
    if (lane.current && traveler.current) {
      setX(Math.max(0, traveler.current.getBoundingClientRect().left - lane.current.getBoundingClientRect().left));
    }
    setAction("idle");
  }

  function interact(next: Action) {
    settle();
    setMenu(false);
    setAction(next);
    chirp();
  }

  useEffect(() => {
    if (!visible || menu) return;
    if (action === "idle" && (preferences.paused || reducedMotion)) return;
    const timer = window.setTimeout(() => {
      if (action !== "idle") { setAction("idle"); return; }
      const choices: Action[] = ["walk", "eat", "sneeze", "sleep", "love", "jump", "dance"];
      const next = choices[Math.floor(Math.random() * choices.length)];
      if (next === "walk") {
        const available = Math.max(0, (lane.current?.clientWidth ?? size) - size);
        const destination = Math.round(Math.random() * available);
        setFacing(destination > x ? 1 : -1);
        setX(destination);
      }
      setAction(next);
    }, DURATIONS[action]);
    return () => window.clearTimeout(timer);
  }, [action, menu, preferences.paused, reducedMotion, visible, x, size]);

  useEffect(() => {
    const element = lane.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setX(current => Math.min(current, Math.max(0, element.clientWidth - size))));
    observer.observe(element);
    const visibility = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "80px" });
    visibility.observe(element);
    return () => { observer.disconnect(); visibility.disconnect(); };
  }, [size]);

  useEffect(() => () => { void audio.current?.close().catch(() => {}); }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        traveler.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menu]);

  const currentSpeech = action === "idle" ? reactive.phrase : PHRASES[action];
  const currentImg =
    action === "sleep"
      ? "/joojo/hatchling.png"
      : action === "idle"
      ? (reactive.image || stellaImage(variant))
      : stellaImage(variant);

  return <>
    <div ref={lane} className={inline ? "joojo-pet-lane joojo-pet-inline-lane" : "joojo-pet-lane"} data-resting={!visible || reducedMotion || (preferences.paused && action === "idle")}>
      <div ref={traveler} className="joojo-pet-traveler" data-action={action} style={{ transform: `translate3d(${x}px, 0, 0)` }}>
        <span className="joojo-pet-speech" aria-hidden="true">{currentSpeech}</span>
        <span className="joojo-pet-shadow" aria-hidden="true" />
        <button type="button" className="joojo-pet-character" aria-label={`جوجو: ${currentSpeech}؛ بازکردن کنترل‌ها`} aria-expanded={menu} aria-controls={menu ? menuId : undefined} onClick={() => { settle(); setMenu(!menu); }}>
          <span className="joojo-pet-direction" style={{ transform: `scaleX(${facing})` }}>
            <Image src={currentImg} alt="جوجو" width={112} height={112} sizes="112px" draggable={false} className="joojo-pet-body" />
          </span>
          {(action === "jump" || action === "dance") && <span className="joojo-pet-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i></span>}
          {action === "eat" && <span className="joojo-pet-grains" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ left: i * 7, bottom: (i % 3) * 4, animationDelay: `${i * .06}s` }} />)}</span>}
          {action === "sneeze" && <span className="joojo-pet-puff" aria-hidden="true">✧ · ✧</span>}
          {action === "love" && <span className="joojo-pet-hearts" aria-hidden="true">♡ ♥ ♡</span>}
          {action === "sleep" && <span className="joojo-pet-zzz" aria-hidden="true">z Z z</span>}
        </button>
      </div>
    </div>
    {menu && createPortal(<section id={menuId} className="joojo-pet-menu" aria-label="کنترل جوجو">
      <div className="joojo-pet-menu-title"><strong>جوجوی صورتی 🎀</strong><button type="button" aria-label="بستن کنترل جوجو" onClick={() => setMenu(false)}><X size={16} /></button></div>
      
      {/* Data-Reactive Mood Station Card */}
      <div className="joojo-pet-reactive-status">
        <div className="joojo-pet-reactive-header">
          <span className="joojo-pet-reactive-badge">{reactive.badge}</span>
          {reactive.statBadge && <span className="joojo-pet-reactive-stat">{reactive.statBadge}</span>}
        </div>
        <strong className="joojo-pet-reactive-title">{reactive.title}</strong>
        <p className="joojo-pet-reactive-subtitle">{reactive.subtitle}</p>
        <div className="joojo-pet-reactive-advice">
          <span aria-hidden="true">💡</span>
          <span>{reactive.advice}</span>
        </div>
      </div>

      <div className="joojo-pet-actions">
        <button type="button" onClick={() => interact("eat")}><Wheat size={17} />دون بده</button>
        <button type="button" onClick={() => interact("love")}><Heart size={17} />نازش کن</button>
        <button type="button" onClick={() => interact("sleep")}><Moon size={17} />وقت چرت</button>
        <button type="button" onClick={() => interact("sneeze")}><span aria-hidden="true">✧</span>یه عطسه!</button>
        <button type="button" onClick={() => interact("jump")}><Sparkles size={17} />بپر بالا</button>
        <button type="button" onClick={() => interact("dance")}><Music2 size={17} />برقص جوجو</button>
        <button type="button" aria-pressed={preferences.paused} onClick={() => { settle(); updatePreferences({ paused: !preferences.paused }); }}>{preferences.paused ? <Play size={17} /> : <Pause size={17} />}{preferences.paused ? "حرکت خودکار" : "توقف حرکت"}</button>
        <button type="button" aria-pressed={preferences.sound} onClick={() => void toggleSound()}>{preferences.sound ? <Volume2 size={17} /> : <VolumeX size={17} />}{preferences.sound ? "صدا روشنه" : "صدا خاموشه"}</button>
      </div>
      {reducedMotion && <p className="mt-2 text-[10px] text-muted-foreground">با تنظیم کاهش حرکت دستگاه، حرکت خودکار خاموش است.</p>}
    </section>, document.body)}
  </>;
}

export function JoojoPet({ inline = false, variant }: { inline?: boolean; variant?: StellaVariant }) {
  const pathname = usePathname();
  const { mood } = useAppearance();
  const compact = useSyncExternalStore(subscribeCompact, () => window.matchMedia("(max-width: 1023px)").matches, () => false);
  return mood === "joojo" && inline === compact ? <LivingJoojo inline={inline} variant={variant ?? stellaForPage(pathname.split("/")[1])} /> : null;
}
