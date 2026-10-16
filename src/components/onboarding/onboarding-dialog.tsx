"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Wallet, PieChart, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

const STEPS = [
  {
    title: "حساب و تراکنش اول",
    description:
      "یک حساب بانکی یا نقدی بسازید و اولین درآمد یا هزینه را ثبت کنید تا داشبورد زنده شود.",
    icon: Wallet,
    href: "/accounts",
    cta: "رفتن به حساب‌ها",
  },
  {
    title: "بودجه و دسته‌بندی",
    description:
      "برای هزینه‌های مهم بودجه ماهانه تعریف کنید و از گزارش‌ها پیشرفت خود را ببینید.",
    icon: PieChart,
    href: "/budget",
    cta: "تنظیم بودجه",
  },
  {
    title: "امکانات پیشرفته",
    description:
      "از بخش زندگی برای کارها و عادت‌های روزانه، و از Ctrl+K برای جستجوی سریع استفاده کنید.",
    icon: Sparkles,
    href: "/life",
    cta: "رفتن به زندگی",
  },
] as const;

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((d) => {
        if (!d.completed) setOpen(true);
      })
      .catch(() => {});
  }, []);

  const finish = async () => {
    await fetch("/api/onboarding", { method: "POST" });
    setOpen(false);
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && finish()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>خوش آمدید!</DialogTitle>
          <DialogDescription>
            راهنمای سریع {step + 1} از {STEPS.length}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center text-center py-2 space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{current.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {current.description}
            </p>
          </div>
          <Link
            href={current.href}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {current.cta}
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            <ChevronRight className="h-4 w-4 ml-1" />
            قبلی
          </Button>

          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i === step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <Button type="button" size="sm" onClick={finish}>
              شروع کنید
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep((s) => s + 1)}
            >
              بعدی
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={finish}
          className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
        >
          رد کردن راهنما
        </button>
      </DialogContent>
    </Dialog>
  );
}
