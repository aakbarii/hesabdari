"use client";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, ListTodo, Check } from "lucide-react";
import { PLAYBOOKS } from "@/lib/module-playbooks";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export function WorkflowGuide({ module }: { module: string }) {
  const guide = PLAYBOOKS[module];
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);
  if (!guide) return null;
  const createPlan = async () => {
    setPending(true);
    try {
      const response = await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: guide.title, description: [...guide.steps.map(step => `□ ${step}`), `مرور: ${guide.review}`, `بخش مرتبط: /${module}`].join("\n"), area: guide.area ?? "personal", priority: "medium" }) });
      if (!response.ok) throw new Error();
      setCreated(true); toast.success("برنامهٔ این بخش به کارها اضافه شد؛ جزئیاتش قابل ویرایش است.");
      window.dispatchEvent(new Event("ravaal:records-updated"));
    } catch { toast.error("برنامه ثبت نشد. دوباره تلاش کن."); }
    finally { setPending(false); }
  };
  return <details className="rounded-2xl border bg-card/70 px-4 py-3"><summary className="cursor-pointer text-sm font-semibold"><BookOpen className="ml-2 inline h-4 w-4 text-primary" /> مسیر عملی این بخش · {guide.title}</summary><div className="mt-4 space-y-4"><ol className="mr-5 list-decimal space-y-3 text-sm leading-7">{guide.steps.map(step => <li key={step}>{step}</li>)}</ol><p className="rounded-xl bg-muted/60 p-3 text-xs leading-7"><strong>در مرور بعدی: </strong>{guide.review}</p><div className="flex flex-wrap items-center gap-3"><Button size="sm" variant="outline" disabled={pending || created} onClick={() => void createPlan()}>{created ? <Check className="h-4 w-4" /> : <ListTodo className="h-4 w-4" />}{pending ? "در حال ثبت…" : created ? "به کارها اضافه شد" : "این برنامه را به کارهای من اضافه کن"}</Button>{created && <Link href="/life" className="text-xs text-primary">دیدن و ویرایش برنامه ←</Link>}</div></div></details>;
}
