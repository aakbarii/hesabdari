"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Shield } from "lucide-react";
import { toast } from "sonner";
import { AppLogo } from "@/components/layout/app-logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupName, setSetupName] = useState("من");
  const [requires2fa, setRequires2fa] = useState(false);
  const [pendingToken, setPendingToken] = useState("");
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace("/");
        setNeedsSetup(Boolean(d.needsSetup));
      });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = needsSetup ? "/api/auth/setup" : "/api/auth/login";
      const body = needsSetup
        ? { email, password, name: setupName }
        : { email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");

      if (data.requires2fa) {
        setPendingToken(data.pendingToken);
        setRequires2fa(true);
        toast.message("کد ۶ رقمی اپ احراز هویت را وارد کنید");
        return;
      }

      toast.success(needsSetup ? "حساب فعال شد" : "خوش آمدید");
      router.replace(searchParams.get("from") ?? "/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ورود");
    } finally {
      setLoading(false);
    }
  };

  const verify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("خوش آمدید");
      router.replace(searchParams.get("from") ?? "/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "کد نامعتبر");
    } finally {
      setLoading(false);
    }
  };

  if (requires2fa) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md motion-scale-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Shield className="h-6 w-6" />
            </div>
            <CardTitle>تأیید دو مرحله‌ای</CardTitle>
            <p className="text-sm text-muted-foreground">
              کد ۶ رقمی Google Authenticator یا اپ مشابه را وارد کنید
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={verify2fa} className="space-y-4">
              <div className="space-y-2">
                <Label>کد تأیید</Label>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  placeholder="۰۰۰۰۰۰"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "..." : "تأیید و ورود"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setRequires2fa(false);
                  setPendingToken("");
                  setTotpCode("");
                }}
              >
                بازگشت
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md motion-scale-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <AppLogo size="xl" showText={false} clickable={false} />
          </div>
          <CardTitle className="text-2xl font-black">
            {needsSetup ? "راه‌اندازی و ورود به سامان" : "ورود به سامان"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {needsSetup
              ? "برای داده‌های فعلی رمز عبور تعیین کنید"
              : "سیستم جامع مدیریت زندگی و دارایی"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {needsSetup && (
              <div className="space-y-2">
                <Label>نام</Label>
                <Input
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>ایمیل</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ایمیل شما"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>رمز عبور</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : needsSetup ? "فعال‌سازی" : "ورود"}
            </Button>
          </form>
          {!needsSetup && (
            <p className="text-center text-sm text-muted-foreground mt-4 space-x-2">
              <Link href="/forgot-password" className="text-primary hover:underline">
                فراموشی رمز؟
              </Link>
              {" · "}
              حساب ندارید؟{" "}
              <Link href="/register" className="text-primary hover:underline">
                ثبت‌نام
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
