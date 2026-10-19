"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return <div role="alert" className="flex min-h-[65vh] flex-col items-center justify-center gap-5 p-8 text-center">
    <div className="rounded-3xl bg-amber-500/10 p-6 text-amber-600"><AlertTriangle className="h-10 w-10" /></div>
    <h1 className="text-2xl font-bold">بارگذاری این بخش با مشکل روبه‌رو شد</h1>
    <p className="max-w-md text-sm leading-7 text-muted-foreground">دوباره تلاش کنید. اگر مشکل ادامه داشت، صفحه را تازه‌سازی کنید.</p>
    <Button onClick={() => retry()}>تلاش دوباره</Button>
  </div>;
}
