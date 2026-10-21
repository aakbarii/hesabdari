"use client";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, CloudOff, Timer, CheckCircle2 } from "lucide-react";
import { toISODate } from "@/lib/format";
import { remainingSeconds, timerSchema, type FocusTimer } from "@/lib/focus-timer";
import { useRecordsRefresh } from "@/components/use-records-refresh";
import { useConfirm } from "@/components/confirm-dialog";
import { toast } from "sonner";

const MODES = { work: { label: "تمرکز", minutes: 25 }, shortBreak: { label: "استراحت کوتاه", minutes: 5 }, longBreak: { label: "استراحت بلند", minutes: 15 } };
const PLANS = [{ name: "شروع کوچک", minutes: 10, hint: "فقط یک قدم مشخص را تمام کن." }, { name: "مطالعه", minutes: 25, hint: "یک مبحث، همراه با یادداشت و مرور پایانی." }, { name: "کار عمیق", minutes: 50, hint: "یک خروجی روشن؛ اعلان‌ها را کنار بگذار." }, { name: "مرور روز", minutes: 15, hint: "کارهای انجام‌شده و قدم فردا را مرور کن." }];
const blank = (mode: keyof typeof MODES, minutes = MODES[mode].minutes): FocusTimer => ({ mode, duration: minutes, remaining: minutes * 60, deadline: null, payload: null, pending: false });
export default function FocusPage() {
  const [timer, setTimer] = useState<FocusTimer>(blank("work"));
  const [task, setTask] = useState("");
  const [category, setCategory] = useState<"work" | "study" | "coding" | "personal">("work");
  const [owner, setOwner] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{
    totalMinutes: number;
    sessionCount: number;
    sessions: { id: string; taskName: string; durationMinutes: number }[];
    weekStats?: { totalMinutes: number; sessionCount: number; byDay: { label: string; value: number }[] } | null;
  }>({ totalMinutes: 0, sessionCount: 0, sessions: [] });
  const [todos, setTodos] = useState<{ id: string; title: string }[]>([]);
  const [todoId, setTodoId] = useState("");
  const busy = useRef(false);
  const confirm = useConfirm();
  const today = toISODate(new Date());
  const loadStats = async () => {
    try {
      const response = await fetch(`/api/focus?date=${today}&week=1`);
      if (!response.ok) throw new Error();
      setStats(await response.json());
    } catch {
      toast.error("دریافت آمار تمرکز انجام نشد");
    }
  };
  useRecordsRefresh(() => { void loadStats(); });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal }).then(r => r.json()).then(data => {
      if (!data.user?.id) throw new Error();
      const key = `ravaal:focus:${data.user.id}`;
      try { const parsed = timerSchema.safeParse(JSON.parse(sessionStorage.getItem(key) ?? "null")); if (parsed.success) { setTimer(parsed.data); if (parsed.data.payload) { setTask(parsed.data.payload.taskName); setCategory(parsed.data.payload.category); } } } catch { /* Start clean if storage is unavailable. */ }
      setOwner(data.user.id);
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    fetch(`/api/focus?date=${today}&week=1`, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setStats).catch(() => { if (!controller.signal.aborted) toast.error("دریافت آمار تمرکز انجام نشد"); });
    fetch("/api/todos?filter=active", { signal: controller.signal }).then(r => r.ok ? r.json() : []).then((list) => setTodos(Array.isArray(list) ? list.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })) : [])).catch(() => {});
    return () => controller.abort();
    // The initial load is per mount; the records refresh hook handles later edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (!owner) return; try { sessionStorage.setItem(`ravaal:focus:${owner}`, JSON.stringify(timer)); } catch { /* The timer remains usable without session storage. */ } }, [owner, timer]);
  useEffect(() => {
    if (!timer.deadline || !owner) return;
    const tick = () => setTimer(current => {
      if (!current.deadline) return current;
      const remaining = remainingSeconds(current.deadline);
      if (remaining === current.remaining && remaining > 0) return current;
      return { ...current, remaining, deadline: remaining ? current.deadline : null, pending: remaining === 0 };
    });
    tick(); const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [timer.deadline, owner]);
  const saveCompleted = async () => {
    if (!timer.payload || busy.current) return;
    busy.current = true; setSaving(true);
    try {
      const response = await fetch("/api/focus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...timer.payload, todoId: todoId || null }) });
      if (!response.ok) throw new Error();
      toast.success(`${timer.duration} دقیقه تمرکز ثبت شد`);
      setTimer(blank((stats.sessionCount + 1) % 4 === 0 ? "longBreak" : "shortBreak"));
      await loadStats();
    } catch { toast.error("جلسه ذخیره نشد؛ با «ثبت دوباره» تلاش کن. زمانت محفوظ است."); }
    finally { busy.current = false; setSaving(false); }
  };
  const reset = async (mode: keyof typeof MODES = timer.mode, duration = MODES[mode].minutes) => {
    if ((timer.payload || timer.pending) && !await confirm({ title: "جلسهٔ فعلی کنار گذاشته شود؟", description: timer.pending ? "جلسهٔ تمام‌شده هنوز ثبت نشده؛ با ادامه از دست می‌رود." : "زمان این جلسه ثبت نخواهد شد.", confirmLabel: "شروع دوباره" })) return;
    setTimer(blank(mode, duration));
  };
  const toggle = () => {
    if (timer.deadline) setTimer({ ...timer, remaining: remainingSeconds(timer.deadline), deadline: null });
    else {
      if (timer.mode === "work" && !task.trim()) { toast.error("ابتدا خروجی مشخص این جلسه را بنویس"); return; }
      setTimer({ ...timer, deadline: Date.now() + timer.remaining * 1000, payload: timer.mode === "work" ? timer.payload ?? { clientId: crypto.randomUUID(), taskName: task.trim(), durationMinutes: timer.duration, category, date: today } : null });
    }
  };
  const progress = Math.round((1 - timer.remaining / (timer.duration * 60)) * 100);
  return <><Header title="تمرکز و کار عمیق" /><div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-8"><PageHero heroKey="focus" title="یک جلسه، یک خروجی روشن" subtitle="زمان‌سنج با بازیابی پس از تغییر صفحه، مدت دلخواه و ثبت قابل پیگیری" />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Card className="p-5"><span className="text-sm text-muted-foreground">تمرکز امروز</span><strong className="mt-2 block text-3xl">{stats.totalMinutes.toLocaleString("fa-IR")} <small className="text-sm">دقیقه</small></strong></Card><Card className="p-5"><span className="text-sm text-muted-foreground">جلسات امروز</span><strong className="mt-2 block text-3xl">{stats.sessionCount.toLocaleString("fa-IR")}</strong></Card><Card className="p-5"><span className="text-sm text-muted-foreground">هفته</span><strong className="mt-2 block text-3xl">{(stats.weekStats?.totalMinutes ?? 0).toLocaleString("fa-IR")} <small className="text-sm">دقیقه</small></strong><p className="text-xs text-muted-foreground mt-1">{stats.weekStats?.sessionCount ?? 0} جلسه</p></Card></div>
    {stats.weekStats?.byDay && <Card className="p-4"><p className="text-xs text-muted-foreground mb-2">روند هفته</p><div className="flex items-end gap-1 h-14">{stats.weekStats.byDay.map((d) => { const peak = Math.max(1, ...stats.weekStats!.byDay.map(x => x.value)); return <div key={d.label} className="flex-1 flex flex-col items-center gap-1"><div className="w-full bg-primary/70 rounded-t-sm" style={{ height: `${Math.max(6, Math.round((d.value / peak) * 100))}%` }} /><span className="text-[9px] text-muted-foreground">{d.label.slice(3)}</span></div>; })}</div></Card>}
    {loadError && <p role="alert" className="rounded-xl border p-4 text-sm">بازیابی حساب انجام نشد؛ صفحه را تازه کن. زمان‌سنج تا مشخص‌شدن حساب شروع نمی‌شود.</p>}
    <Card className="space-y-5 p-5 sm:p-8"><div className="flex flex-wrap justify-center gap-2">{Object.entries(MODES).map(([mode, meta]) => <Button key={mode} disabled={saving || !owner} variant={timer.mode === mode ? "default" : "outline"} onClick={() => void reset(mode as keyof typeof MODES)}>{meta.label}</Button>)}</div>
      <div role="timer" aria-label="زمان باقی‌مانده" className="text-center font-mono text-7xl font-semibold tabular-nums sm:text-8xl" dir="ltr">{String(Math.floor(timer.remaining / 60)).padStart(2, "0")}:{String(timer.remaining % 60).padStart(2, "0")}</div>
      <progress aria-label="پیشرفت جلسه" max={100} value={progress} className="h-2 w-full accent-[var(--primary)]" />
      {timer.pending ? <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-center" role="status"><p className="text-sm">{timer.mode === "work" ? "جلسه تمام شد؛ برای ثبت نهایی آماده است." : "استراحت تمام شد؛ آمادهٔ قدم بعدی هستی."}</p>{timer.mode === "work" ? <Button disabled={saving} onClick={() => void saveCompleted()}><CloudOff className="h-4 w-4" />{saving ? "در حال ثبت…" : "ثبت جلسه / ثبت دوباره"}</Button> : <Button onClick={() => setTimer(blank("work"))}>شروع جلسهٔ بعد</Button>}</div> : <div className="flex justify-center gap-3"><Button disabled={!owner || saving} onClick={toggle} className="min-w-32">{timer.deadline ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{timer.deadline ? "توقف موقت" : timer.payload ? "ادامه" : "شروع"}</Button><Button variant="outline" disabled={saving} onClick={() => void reset()}><RotateCcw className="h-4 w-4" /> از اول</Button></div>}
      <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-2 sm:col-span-2"><span className="text-sm font-medium">خروجی مشخص این جلسه</span><Input maxLength={200} disabled={!!timer.payload || timer.pending} value={task} onChange={e => setTask(e.target.value)} placeholder="مثلاً نوشتن مقدمهٔ گزارش، نه فقط «کارکردن»" /></label><label className="space-y-2"><span className="text-sm font-medium">دسته</span><select disabled={!!timer.payload || timer.pending} value={category} onChange={e => setCategory(e.target.value as typeof category)} className="h-10 w-full rounded-lg border bg-background px-3"><option value="work">کار</option><option value="study">مطالعه</option><option value="coding">برنامه‌نویسی</option><option value="personal">شخصی</option></select></label></div>
      {todos.length > 0 && <label className="space-y-2 block"><span className="text-sm font-medium">اتصال به تسک زندگی (اختیاری)</span><select disabled={!!timer.payload || timer.pending} value={todoId} onChange={e => { setTodoId(e.target.value); const t = todos.find(x => x.id === e.target.value); if (t && !task.trim()) setTask(t.title); }} className="h-10 w-full rounded-lg border bg-background px-3"><option value="">بدون تسک</option>{todos.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>}
      <label className="flex items-center gap-3 text-sm">مدت دلخواه (دقیقه)<Input aria-label="مدت جلسه" className="w-24" type="number" min={1} max={240} disabled={!!timer.payload || !!timer.deadline || timer.pending} value={timer.duration} onChange={e => { const duration = Number(e.target.value); if (Number.isInteger(duration) && duration >= 1 && duration <= 240) setTimer(blank(timer.mode, duration)); }} /></label>
      <p className="text-xs leading-7 text-muted-foreground">جلسه در همین تب بازیابی می‌شود؛ بستن کامل تب آن را نگه نمی‌دارد. هنگام خروج از صفحه، زمان از روی ساعت واقعی ادامه پیدا می‌کند. ثبت تکراری یک جلسه دوباره شمرده نمی‌شود.</p>
    </Card>
    <section className="space-y-3"><h2 className="flex items-center gap-2 font-semibold"><Timer className="h-5 w-5" /> الگوی جلسه</h2><div className="grid gap-3 sm:grid-cols-2">{PLANS.map(plan => <button key={plan.name} disabled={saving || !owner} onClick={() => void reset("work", plan.minutes)} className="rounded-xl border bg-card p-4 text-right hover:border-primary/50"><strong className="text-sm">{plan.name} · {plan.minutes} دقیقه</strong><p className="mt-2 text-xs leading-6 text-muted-foreground">{plan.hint}</p></button>)}</div></section>
    <section className="space-y-3"><h2 className="font-semibold">خروجی‌های امروز</h2>{stats.sessions.length ? stats.sessions.map(session => <Card key={session.id} className="flex flex-row items-center gap-3 p-4"><CheckCircle2 className="h-5 w-5 text-primary" /><span className="flex-1 text-sm">{session.taskName}</span><span className="text-xs text-muted-foreground">{session.durationMinutes} دقیقه</span></Card>) : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">با یک جلسهٔ کوتاه و یک خروجی مشخص شروع کن.</p>}</section>
  </div></>;
}
