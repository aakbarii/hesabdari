"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppLogo } from "@/components/layout/app-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDevUrl(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success(data.message);
      if (data.devResetUrl) setDevUrl(data.devResetUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md motion-scale-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <AppLogo size="xl" showText={false} clickable={false} />
          </div>
          <CardTitle className="text-2xl font-black">بازیابی رمز عبور سامان</CardTitle>
          <p className="text-sm text-muted-foreground">
            لینک بازیابی رمز عبور به ایمیل شما ارسال می‌شود.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>ایمیل</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : "ارسال لینک بازیابی"}
            </Button>
          </form>
          {devUrl && (
            <div className="mt-4 rounded-lg border bg-muted/50 p-3 text-xs break-all">
              <p className="text-muted-foreground mb-1">لینک توسعه (dev):</p>
              <Link href={devUrl} className="text-primary hover:underline">
                {devUrl}
              </Link>
            </div>
          )}
          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link href="/login" className="text-primary hover:underline">
              بازگشت به ورود
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
