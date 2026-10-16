"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppLogo } from "@/components/layout/app-logo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("رمزها یکسان نیستند");
      return;
    }
    if (!token) {
      toast.error("لینک نامعتبر است");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("رمز با موفقیت تغییر کرد");
      router.replace("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md motion-scale-in">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">لینک بازیابی نامعتبر است.</p>
            <Link href="/forgot-password" className="text-primary hover:underline">
              درخواست لینک جدید
            </Link>
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
          <CardTitle className="text-2xl font-black">تعیین رمز جدید سامان</CardTitle>
          <p className="text-sm text-muted-foreground">رمز عبور جدید خود را وارد نمایید</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>رمز جدید</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>تکرار رمز</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : "ذخیره رمز جدید"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
