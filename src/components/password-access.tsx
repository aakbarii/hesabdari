"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/locale-provider";

export function PasswordAccess({ register = false, returnPath = "/" }: { register?: boolean; returnPath?: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const en = locale === "en";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = register ? "register" : "login";
  const heading = register ? (en ? "Create an account" : "ساخت حساب") : (en ? "Sign in" : "ورود");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const password = String(form.get("password") ?? "");
    if (Array.from(password).length < 12 || new TextEncoder().encode(password).length > 72) {
      setError(en ? "Use at least 12 characters and at most 72 bytes." : "رمز باید حداقل ۱۲ نویسه و حداکثر ۷۲ بایت باشد.");
      return;
    }
    if (register && password !== form.get("confirmPassword")) {
      setError(en ? "The passwords do not match." : "رمز و تکرارش یکسان نیستند.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(register ? { name: form.get("name"), email, password, locale } : { email, password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(en ? (response.status === 401 ? "Incorrect email or password." : "Could not continue. Check your details and try again.") : data?.error || "دوباره تلاش کن.");
        return;
      }
      router.replace(returnPath);
      router.refresh();
    } catch {
      setError(en ? "Could not connect. Try again." : "اتصال برقرار نشد. دوباره تلاش کن.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <section className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 sm:p-8">
        <div className="space-y-3">
          <AppLogo size="md" clickable={false} />
          <h1 className="text-xl font-semibold">{heading}</h1>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          {register && <label className="block space-y-2 text-sm">
            <span>{en ? "Name" : "نام"}</span>
            <Input name="name" autoComplete="name" required minLength={2} maxLength={120} disabled={busy} />
          </label>}
          <label className="block space-y-2 text-sm">
            <span>{en ? "Email" : "ایمیل"}</span>
            <Input type="email" name="email" autoComplete="username" dir="ltr" required maxLength={254} disabled={busy} />
          </label>
          <label className="block space-y-2 text-sm">
            <span>{en ? "Password" : "رمز عبور"}</span>
            <Input type="password" name="password" autoComplete={register ? "new-password" : "current-password"} required minLength={12} maxLength={72} disabled={busy} />
          </label>
          {register && <label className="block space-y-2 text-sm">
            <span>{en ? "Confirm password" : "تکرار رمز عبور"}</span>
            <Input type="password" name="confirmPassword" autoComplete="new-password" required maxLength={72} disabled={busy} />
          </label>}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="min-h-11 w-full" disabled={busy}>
            {busy ? (en ? "Please wait…" : "کمی صبر کن…") : heading}
          </Button>
        </form>
        <Link className="block text-center text-sm font-medium text-primary hover:underline" href={`/${register ? "login" : "register"}?from=${encodeURIComponent(returnPath)}`}>
          {register ? (en ? "I have an account" : "حساب دارم") : (en ? "Create an account" : "ساخت حساب جدید")}
        </Link>
      </section>
    </div>
  );
}
