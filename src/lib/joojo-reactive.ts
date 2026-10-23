"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

export type JoojoReactiveState =
  | "sleepy"
  | "morning"
  | "todos_done"
  | "todos_pending"
  | "streak_proud"
  | "budget_champion"
  | "budget_warning"
  | "study_focus"
  | "idle_happy";

export interface JoojoReactiveInfo {
  state: JoojoReactiveState;
  title: string;
  badge: string;
  image: string;
  phrase: string;
  subtitle: string;
  advice: string;
  statBadge?: string;
}

export interface DashboardMetrics {
  totalBalance?: number;
  monthly?: {
    income?: number;
    expense?: number;
    balance?: number;
  };
  lifeSummary?: {
    todos?: {
      total: number;
      today: number;
      overdue: number;
      done?: number;
    };
    routines?: {
      dueToday: number;
      completedToday: number;
      maxStreak: number;
    };
    todayProgress?: number;
  };
}

let cachedMetrics: DashboardMetrics | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 2; // 2 minutes

export function computeJoojoReactiveState(
  pathname: string,
  metrics: DashboardMetrics | null,
  hour = new Date().getHours()
): JoojoReactiveInfo {
  const page = pathname.split("/")[1] || "";

  // 1. Sleep & Late-Night Check (Highest priority for wellness)
  if (hour >= 23 || hour < 6 || ["sleep", "selfcare"].includes(page)) {
    return {
      state: "sleepy",
      title: "وقت استراحت و چرت 🌙",
      badge: "دیرخوابی / استراحت",
      image: "/joojo/hatchling.png",
      phrase: "دیروقته، چشمات خسته نشه؟ جوجو خواب‌آلود شده، بیا بخوابیم… zZz",
      subtitle: "جوجوی پشمالوی ناز با چشم‌های درشت",
      advice: "خواب به موقع فردا رو پرانرژی و متمرکز می‌کنه.",
      statBadge: hour >= 23 || hour < 6 ? `ساعت ${hour}:00 شب` : undefined,
    };
  }

  // 2. Focus & Learning Pages
  if (["focus", "learning", "goals"].includes(page)) {
    return {
      state: "study_focus",
      title: "مود تمرکز و مطالعه 👓",
      badge: "تمرکز عمیق",
      image: "/joojo/winking.png",
      phrase: "آماده و متمرکز برای هدف‌های بزرگ! بریم برای ترکوندن ♡",
      subtitle: "جوجو با چشمک و انگیزه بالا",
      advice: "تقسیم کارها به پارت‌های ۲۵ دقیقه‌ای معجزه می‌کنه.",
      statBadge: "تمرکز فعال",
    };
  }

  // 3. Life & Todo Accomplishment Check
  const life = metrics?.lifeSummary;
  if (life) {
    // A. All Todos Done Today!
    if (life.todayProgress === 100 || (life.todos && life.todos.today === 0 && (life.todos.done ?? 0) > 0)) {
      return {
        state: "todos_done",
        title: "شاهکار تیک زدن! ⭐",
        badge: "تسک‌های کامل",
        image: "/joojo/winking.png",
        phrase: "همه کارهای امروز رو تیک زدی! تو واقعاً معرکه‌ای، بهت افتخار می‌کنم! 🌸",
        subtitle: "جوجو با چشمک پیروزی و لبخند",
        advice: "حالا وقت یه استراحت دلچسب و نوشیدنی گرمه.",
        statBadge: "۱۰۰٪ تسک‌های امروز",
      };
    }

    // B. Habit Streak >= 3 days
    if (life.routines && life.routines.maxStreak >= 3) {
      return {
        state: "streak_proud",
        title: "قهرمان استمرار 🌿",
        badge: `استریک ${life.routines.maxStreak} روزه`,
        image: "/joojo/winking.png",
        phrase: `استریک عادت‌هات ${life.routines.maxStreak} روزه شد! دمت گرم قهرمان 🌸`,
        subtitle: "جوجو با چشمک و حس غرور",
        advice: "استمرار از شدت مهم‌تره؛ همین دست‌فرمون رو برو جلو!",
        statBadge: `🔥 ${life.routines.maxStreak} روز متوالی`,
      };
    }

    // C. Overdue tasks nudge
    if (life.todos && life.todos.overdue > 0) {
      return {
        state: "todos_pending",
        title: "برنامه‌ریزی تسک‌ها 📖",
        badge: `${life.todos.overdue} کار عقب‌افتاده`,
        image: "/joojo/smiling.png",
        phrase: "چند تا کار رو میز مونده، بیا همین الان یکیش رو خط بزنیم!",
        subtitle: "جوجو با نگاه پرانرژی و مشوق",
        advice: "ساده‌ترین تسک رو انتخاب کن و در ۲ دقیقه شروع کن.",
        statBadge: `⚠️ ${life.todos.overdue} کار مانده`,
      };
    }
  }

  // 4. Budget & Financial Health Check
  const monthly = metrics?.monthly;
  if (monthly && monthly.income !== undefined && monthly.expense !== undefined) {
    if (monthly.income > 0 && monthly.expense > monthly.income) {
      return {
        state: "budget_warning",
        title: "حواست به بودجه باشه 🪙",
        badge: "هشدار مصرف",
        image: "/joojo/smiling.png",
        phrase: "این ماه خرج‌ها یکم از دخلت جلو زده؛ بیا حواسمون رو به خرج‌های غیرضروری بدیم!",
        subtitle: "جوجو با نگاه مراقب و دلسوز",
        advice: "خریدهای غیرضروری این هفته رو به تعویق بنداز.",
        statBadge: "تراز منفی ماه",
      };
    }

    if (monthly.balance !== undefined && monthly.balance > 0 && monthly.income > 0) {
      const savingsRate = Math.round((monthly.balance / monthly.income) * 100);
      if (savingsRate >= 15) {
        return {
          state: "budget_champion",
          title: "مدیریت مالی طلایی 🪙",
          badge: `پس‌انداز ${savingsRate}٪`,
          image: "/joojo/floating.png",
          phrase: "وضعیت دخل و خرجت عالیه! پر انرژی و سبک‌بال رو به اوج ✨",
          subtitle: "جوجو در حال پرواز با پرهای قشنگش",
          advice: "این روند رو ادامه بده تا هدف‌های مالیت سریع‌تر محقق بشن.",
          statBadge: `+${savingsRate}٪ مازاد ماهانه`,
        };
      }
    }
  }

  // 5. Morning Coffee Energy (06:00 - 10:59)
  if (hour >= 6 && hour < 11) {
    return {
      state: "morning",
      title: "صبح دل‌انگیز بخیر ☕",
      badge: "انرژی صبحگاهی",
      image: "/joojo/floating.png",
      phrase: "صبح بخیر قهرمان! آماده‌ایم برای یه روز پرانرژی و پربرکت ♡",
      subtitle: "جوجوی پرانرژی در حال پرواز",
      advice: "امروز سه اولویت اصلیت رو مشخص کن و شروع کن.",
      statBadge: "انرژی تازه",
    };
  }

  // 6. Default Cheerful Companion
  return {
    state: "idle_happy",
    title: "جوجو همیشه کنارت هست 🎀",
    badge: "همراه روزانه",
    image: "/joojo/smiling.png",
    phrase: "من اینجام، کنارت برای یک روز آروم و منظم! ♡",
    subtitle: "جوجوی صورتی با لبخند شیرین",
    advice: "قدم‌های کوچک پیوسته، نتایج بزرگ می‌سازن.",
    statBadge: "نظم زندگی",
  };
}

export function useJoojoReactiveMood() {
  const pathname = usePathname();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(cachedMetrics);
  const [, startTransition] = useTransition();

  const refreshMetrics = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) return;
      const data = await res.json();
      cachedMetrics = data;
      lastFetchTime = Date.now();
      startTransition(() => {
        setMetrics(data);
      });
    } catch {
      // Decorative background metric fetch; ignore network fail
    }
  };

  useEffect(() => {
    const now = Date.now();
    if (!cachedMetrics || now - lastFetchTime > CACHE_TTL) {
      void refreshMetrics();
    }

    const onFocus = () => {
      if (Date.now() - lastFetchTime > CACHE_TTL) {
        void refreshMetrics();
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("joojo:refresh-metrics", refreshMetrics);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("joojo:refresh-metrics", refreshMetrics);
    };
  }, []);

  const info = computeJoojoReactiveState(pathname, metrics);

  return {
    ...info,
    metrics,
    refresh: refreshMetrics,
  };
}
