"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAGE_HEROES } from "@/lib/page-heroes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppLogo } from "@/components/layout/app-logo";
import { cn } from "@/lib/utils";

type Gender = "male" | "female";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender) {
      toast.error("جنسیت را انتخاب کنید");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, gender }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("ثبت‌نام موفق");
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ثبت‌نام");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh flex items-center justify-center p-4 py-8">
      <Image
        src={PAGE_HEROES.login}
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-background/75 dark:bg-background/85" />
      <Card className="relative z-10 w-full max-w-md motion-scale-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <AppLogo size="xl" showText={false} clickable={false} />
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums">عضویت در جوجو</CardTitle>
          <p className="text-sm text-muted-foreground">حساب شخصی بسازید و برنامه‌ها و اطلاعات خودتان را مدیریت کنید.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">نام</Label>
              <Input id="register-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-email">ایمیل</Label>
              <Input
                type="email"
                id="register-email"
                autoComplete="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">رمز عبور (حداقل ۶ کاراکتر)</Label>
              <Input
                type="password"
                id="register-password"
                autoComplete="new-password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>جنسیت</Label>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="جنسیت">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  aria-pressed={gender === "male"}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
                    gender === "male"
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  مرد
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  aria-pressed={gender === "female"}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
                    gender === "female"
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  زن
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                برای حساب مردانه، بخش پریود و چرخه نمایش داده نمی‌شود.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : "ثبت‌نام"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            حساب دارید؟{" "}
            <Link href="/login" className="text-primary hover:underline">
              ورود
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
