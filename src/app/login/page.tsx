"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/layout/app-logo";
import { PAGE_HEROES } from "@/lib/page-heroes";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const returnPath =
    from?.startsWith("/") && !from.startsWith("//") && !from.includes("\\") ? from : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupName, setSetupName] = useState("من");
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace(returnPath);
        setNeedsSetup(Boolean(d.needsSetup));
      })
      .catch(() => {});
  }, [router, returnPath]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(needsSetup ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(needsSetup ? { email, password, name: setupName } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ورود انجام نشد");
      toast.success(needsSetup ? "حساب فعال شد" : "خوش آمدید");
      router.replace(returnPath);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ورود انجام نشد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <Image
        src={PAGE_HEROES.login}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] dark:bg-background/85" />

      <main className="relative z-10 w-full max-w-sm rounded-3xl border border-border/70 bg-card/95 p-7 shadow-xl backdrop-blur sm:p-9">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <AppLogo size="lg" showText={false} clickable={false} />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {needsSetup ? "راه‌اندازی روال" : "ورود به روال"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {needsSetup ? "حساب مدیر را بسازید و وارد شوید." : "برای ادامه وارد حساب خود شوید."}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {needsSetup && (
            <div className="space-y-2">
              <Label htmlFor="setup-name">نام</Label>
              <Input id="setup-name" value={setupName} onChange={(e) => setSetupName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="login-email">ایمیل</Label>
            <Input
              id="login-email"
              type="email"
              dir="ltr"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">رمز عبور</Label>
            <Input
              id="login-password"
              type="password"
              dir="ltr"
              autoComplete={needsSetup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="h-11 w-full text-sm" disabled={loading}>
            {loading ? "لطفاً صبر کنید…" : needsSetup ? "فعال‌سازی و ورود" : "ورود"}
          </Button>
        </form>

        {!needsSetup && (
          <div className="mt-6 flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
              فراموشی رمز
            </Link>
            <Link href="/register" className="font-medium text-primary hover:underline">
              ساخت حساب جدید
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center text-muted-foreground">در حال بارگذاری…</div>}>
      <LoginForm />
    </Suspense>
  );
}
