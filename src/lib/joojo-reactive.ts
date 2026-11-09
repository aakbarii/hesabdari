"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n";

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
  hour = new Date().getHours(),
  locale: Locale = "fa"
): JoojoReactiveInfo {
  const en = locale === "en";
  const tx = (fa: string, english: string) => (en ? english : fa);
  const page = pathname.split("/")[1] || "";

  // 1. Sleep & Late-Night Check (Highest priority for wellness)
  if (hour >= 23 || hour < 6 || ["sleep", "selfcare"].includes(page)) {
    return {
      state: "sleepy",
      title: tx("وقت استراحت و چرت 🌙", "Time to rest 🌙"),
      badge: tx("دیرخوابی / استراحت", "Late night / rest"),
      image: "/joojo/hatchling.png",
      phrase: tx("دیروقته، چشمات خسته نشه؟ جوجو خواب‌آلود شده، بیا بخوابیم… zZz", "It's late. Joojo is sleepy — let's rest… zZz"),
      subtitle: tx("جوجوی پشمالوی ناز با چشم‌های درشت", "A fluffy Joojo with wide eyes"),
      advice: tx("خواب به موقع فردا رو پرانرژی و متمرکز می‌کنه.", "Sleeping on time makes tomorrow calmer and clearer."),
      statBadge: hour >= 23 || hour < 6 ? tx(`ساعت ${hour}:00 شب`, `${hour}:00`) : undefined,
    };
  }

  // 2. Focus & Learning Pages
  if (["focus", "learning", "goals"].includes(page)) {
    return {
      state: "study_focus",
      title: tx("مود تمرکز و مطالعه 👓", "Focus mode 👓"),
      badge: tx("تمرکز عمیق", "Deep focus"),
      image: "/joojo/winking.png",
      phrase: tx("آماده و متمرکز برای هدف‌های بزرگ! بریم برای ترکوندن ♡", "Ready for the big goals. One focused block at a time ♡"),
      subtitle: tx("جوجو با چشمک و انگیزه بالا", "Joojo, winking and ready"),
      advice: tx("تقسیم کارها به پارت‌های ۲۵ دقیقه‌ای معجزه می‌کنه.", "Splitting work into 25-minute blocks helps."),
      statBadge: tx("تمرکز فعال", "Focus on"),
    };
  }

  // 3. Life & Todo Accomplishment Check
  const life = metrics?.lifeSummary;
  if (life) {
    // A. All Todos Done Today!
    if (life.todayProgress === 100 || (life.todos && life.todos.today === 0 && (life.todos.done ?? 0) > 0)) {
      return {
        state: "todos_done",
        title: tx("شاهکار تیک زدن! ⭐", "All checked off ⭐"),
        badge: tx("تسک‌های کامل", "Tasks done"),
        image: "/joojo/winking.png",
        phrase: tx("همه کارهای امروز رو تیک زدی! تو واقعاً معرکه‌ای، بهت افتخار می‌کنم! 🌸", "Today's tasks are done. That's a real win 🌸"),
        subtitle: tx("جوجو با چشمک پیروزی و لبخند", "Joojo, winking"),
        advice: tx("حالا وقت یه استراحت دلچسب و نوشیدنی گرمه.", "Take a short break. You earned it."),
        statBadge: tx("۱۰۰٪ تسک‌های امروز", "100% of today's tasks"),
      };
    }

    // B. Habit Streak >= 3 days
    if (life.routines && life.routines.maxStreak >= 3) {
      return {
        state: "streak_proud",
        title: tx("قهرمان استمرار 🌿", "Streak hero 🌿"),
        badge: tx(`استریک ${life.routines.maxStreak} روزه`, `${life.routines.maxStreak}-day streak`),
        image: "/joojo/winking.png",
        phrase: tx(`استریک عادت‌هات ${life.routines.maxStreak} روزه شد! دمت گرم قهرمان 🌸`, `Your habit streak is ${life.routines.maxStreak} days 🌸`),
        subtitle: tx("جوجو با چشمک و حس غرور", "Joojo looks proud"),
        advice: tx("استمرار از شدت مهم‌تره؛ همین دست‌فرمون رو برو جلو!", "Showing up matters more than intensity."),
        statBadge: tx(`🔥 ${life.routines.maxStreak} روز متوالی`, `🔥 ${life.routines.maxStreak} days in a row`),
      };
    }

    // C. Overdue tasks nudge
    if (life.todos && life.todos.overdue > 0) {
      return {
        state: "todos_pending",
        title: tx("برنامه‌ریزی تسک‌ها 📖", "Tasks waiting 📖"),
        badge: tx(`${life.todos.overdue} کار عقب‌افتاده`, `${life.todos.overdue} overdue`),
        image: "/joojo/smiling.png",
        phrase: tx("چند تا کار رو میز مونده، بیا همین الان یکیش رو خط بزنیم!", "A few tasks are still open. Let's finish one now."),
        subtitle: tx("جوجو با نگاه پرانرژی و مشوق", "Joojo, cheering you on"),
        advice: tx("ساده‌ترین تسک رو انتخاب کن و در ۲ دقیقه شروع کن.", "Pick the easiest task and start with two minutes."),
        statBadge: tx(`⚠️ ${life.todos.overdue} کار مانده`, `⚠️ ${life.todos.overdue} left`),
      };
    }
  }

  // 4. Budget & Financial Health Check
  const monthly = metrics?.monthly;
  if (monthly && monthly.income !== undefined && monthly.expense !== undefined) {
    if (monthly.income > 0 && monthly.expense > monthly.income) {
      return {
        state: "budget_warning",
        title: tx("حواست به بودجه باشه 🪙", "Watch the budget 🪙"),
        badge: tx("هشدار مصرف", "Spending alert"),
        image: "/joojo/smiling.png",
        phrase: tx("این ماه خرج‌ها یکم از دخلت جلو زده؛ بیا حواسمون رو به خرج‌های غیرضروری بدیم!", "Spending is ahead of income this month. Let's skip the extras."),
        subtitle: tx("جوجو با نگاه مراقب و دلسوز", "Joojo is keeping an eye out"),
        advice: tx("خریدهای غیرضروری این هفته رو به تعویق بنداز.", "Delay nonessential purchases this week."),
        statBadge: tx("تراز منفی ماه", "Month is in the red"),
      };
    }

    if (monthly.balance !== undefined && monthly.balance > 0 && monthly.income > 0) {
      const savingsRate = Math.round((monthly.balance / monthly.income) * 100);
      if (savingsRate >= 15) {
        return {
          state: "budget_champion",
          title: tx("مدیریت مالی طلایی 🪙", "Money looks healthy 🪙"),
          badge: tx(`پس‌انداز ${savingsRate}٪`, `${savingsRate}% saved`),
          image: "/joojo/floating.png",
          phrase: tx("وضعیت دخل و خرجت عالیه! پر انرژی و سبک‌بال رو به اوج ✨", "Income and spending look great this month ✨"),
          subtitle: tx("جوجو در حال پرواز با پرهای قشنگش", "Joojo is floating along"),
          advice: tx("این روند رو ادامه بده تا هدف‌های مالیت سریع‌تر محقق بشن.", "Keep this pace and the goals get closer."),
          statBadge: tx(`+${savingsRate}٪ مازاد ماهانه`, `+${savingsRate}% left this month`),
        };
      }
    }
  }

  // 5. Morning Coffee Energy (06:00 - 10:59)
  if (hour >= 6 && hour < 11) {
    return {
      state: "morning",
      title: tx("صبح دل‌انگیز بخیر ☕", "Good morning ☕"),
      badge: tx("انرژی صبحگاهی", "Morning energy"),
      image: "/joojo/floating.png",
      phrase: tx("صبح بخیر قهرمان! آماده‌ایم برای یه روز پرانرژی و پربرکت ♡", "Good morning. Ready for a clear day ♡"),
      subtitle: tx("جوجوی پرانرژی در حال پرواز", "Joojo is wide awake"),
      advice: tx("امروز سه اولویت اصلیت رو مشخص کن و شروع کن.", "Name three priorities, then start the first one."),
      statBadge: tx("انرژی تازه", "Fresh start"),
    };
  }

  // 6. Default Cheerful Companion
  return {
    state: "idle_happy",
    title: tx("جوجو همیشه کنارت هست 🎀", "Joojo is here 🎀"),
    badge: tx("همراه روزانه", "Daily companion"),
    image: "/joojo/smiling.png",
    phrase: tx("من اینجام، کنارت برای یک روز آروم و منظم! ♡", "I'm here for a calmer, more organized day ♡"),
    subtitle: tx("جوجوی صورتی با لبخند شیرین", "Joojo, smiling"),
    advice: tx("قدم‌های کوچک پیوسته، نتایج بزرگ می‌سازن.", "Small steady steps add up."),
    statBadge: tx("نظم زندگی", "Daily rhythm"),
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

  const { locale } = useLocale();
  const info = computeJoojoReactiveState(pathname, metrics, new Date().getHours(), locale);

  return {
    ...info,
    metrics,
    refresh: refreshMetrics,
  };
}
