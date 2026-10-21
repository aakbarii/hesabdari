"use client";
import { useRecordsRefresh } from "@/components/use-records-refresh";

import { toISODate } from "@/lib/format";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card,   } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, HeartHandshake, Trophy, Calendar, BookMarked } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MiniTrend, StatChip } from "@/components/mini-trend";

const MOODS = [
  { value: "great", label: "عالی و پرانرژی", emoji: "🤩", color: "bg-emerald-500/10 border-emerald-500 text-emerald-600" },
  { value: "good", label: "خوب و آرام", emoji: "😊", color: "bg-blue-500/10 border-blue-500 text-blue-600" },
  { value: "neutral", label: "معمولی", emoji: "😐", color: "bg-muted border-muted-foreground/30 text-muted-foreground" },
  { value: "tired", label: "خسته و کم‌انرژی", emoji: "🥱", color: "bg-amber-500/10 border-amber-500 text-amber-600" },
  { value: "bad", label: "گرفته و مضطرب", emoji: "😞", color: "bg-rose-500/10 border-rose-500 text-rose-600" },
];

export default function JournalPage() {
  useRecordsRefresh(() => {
    void loadAll();
    fetch(`/api/journal?date=${date}`).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => { setMood(d.entry?.mood ?? "good"); setGratitude(d.entry?.gratitude ?? ""); setHighlights(d.entry?.highlights ?? ""); setNotes(d.entry?.notes ?? ""); }).catch(() => toast.error("بازخوانی ژورنال انجام نشد"));
  });
  const todayStr = toISODate(new Date());
  const [date, setDate] = useState(todayStr);
  const [mood, setMood] = useState<string>("good");
  const [gratitude, setGratitude] = useState("");
  const [highlights, setHighlights] = useState("");
  const [notes, setNotes] = useState("");

  const [pastEntries, setPastEntries] = useState<Array<{ id: string; date: string; mood: string; gratitude: string | null; highlights: string | null; notes: string | null }>>([]);
  const [stats, setStats] = useState<{
    mood7: { label: string; value: number }[];
    mood30: { label: string; value: number }[];
    avgMood7: number;
    loggedToday: boolean;
    nextAction: string;
  } | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadAll = async (q?: string) => {
    try {
      const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`/api/journal${qs}`);
      if (res.ok) {
        const json = await res.json();
        setPastEntries(json.entries || []);
        if (!q?.trim() && json.stats) setStats(json.stats);
      }
    } catch {}
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/journal?date=${date}`, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error("Load failed"); return res.json(); })
      .then((json) => {
        setMood(json.entry?.mood ?? "good"); setGratitude(json.entry?.gratitude ?? "");
        setHighlights(json.entry?.highlights ?? ""); setNotes(json.entry?.notes ?? "");
      }).catch(() => { if (!controller.signal.aborted) toast.error("دریافت ژورنال انجام نشد"); });
    return () => controller.abort();
  }, [date]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/journal", { signal: controller.signal }).then((res) => {
      if (!res.ok) throw new Error("Load failed"); return res.json();
    }).then((json) => {
      setPastEntries(json.entries ?? []);
      if (json.stats) setStats(json.stats);
    }).catch(() => {
      if (!controller.signal.aborted) toast.error("دریافت یادداشت‌ها انجام نشد");
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadAll(searchQ);
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            mood,
            gratitude,
            highlights,
            notes,
          }),
        });
        if (res.ok) {
          toast.success("ژورنال امروز ذخیره شد ✨");
          loadAll();
        } else {
          toast.error("خطا در ذخیره ژورنال");
        }
      } catch {
        toast.error("خطا در ارتباط با سرور");
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <Header title="ژورنال روزانه و حال روحی" />

      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 motion-stagger">
        <PageHero
          heroKey="journal"
          title="ژورنال روزانه و حال روحی"
          subtitle="ثبت حس و حال، شکرگزاری و پیروزی‌های کوچک زندگی"
          action={
            <Badge variant="outline" className="text-xs font-mono">
              {date === todayStr ? "امروز" : date}
            </Badge>
          }
        />
        {stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <StatChip
                label="خلق ۷روز"
                value={stats.avgMood7 ? String(stats.avgMood7) : "—"}
                hint={stats.loggedToday ? "امروز ثبت شده" : "امروز هنوز ننوشته‌ای"}
              />
              <StatChip
                label="اقدام بعدی"
                value={stats.nextAction === "write_today" ? "بنویس" : "استخراج تسک"}
              />
            </div>
            <Card className="p-4 border">
              <p className="text-xs text-muted-foreground mb-2">روند خلق ۷روز</p>
              <MiniTrend
                points={stats.mood7.map((p) => ({ label: p.label, value: p.value }))}
                max={5}
                colorClass="bg-amber-500/80"
              />
            </Card>
          </div>
        )}

        <details className="rounded-2xl border bg-card p-4"><summary className="cursor-pointer text-sm font-semibold">وقتی نمی‌دانم چه بنویسم · پرسش‌های راهنما</summary><div className="mt-3 flex flex-wrap gap-2">{["امروز چه چیزی بیشتر از انتظارم خوب پیش رفت؟", "کدام اتفاق انرژی‌ام را گرفت و دفعهٔ بعد چه انتخابی دارم؟", "چه کاری را عقب انداختم و کوچک‌ترین قدم شروعش چیست؟", "از چه کسی یا چه چیزی قدردانی می‌کنم و چرا؟", "امروز چه چیزی یاد گرفتم که می‌توانم به کار ببرم؟", "در هفتهٔ آینده چه چیزی را کمتر و چه چیزی را بیشتر می‌خواهم؟", "یک تصمیم امروز من چه نتیجه‌ای داشت؟", "اگر فردا فقط یک کار انجام دهم، آن کار چیست؟"].map(prompt => <button type="button" key={prompt} onClick={() => setNotes(previous => [previous, prompt + "\n"].filter(Boolean).join("\n\n"))} className="rounded-xl border px-3 py-2 text-right text-xs leading-6 hover:bg-muted">{prompt}</button>)}</div><p className="mt-3 text-xs text-muted-foreground">پرسش به یادداشت اضافه می‌شود؛ متن قبلی پاک نمی‌شود و تا ذخیره نکنی ارسال نمی‌شود.</p></details>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Journal Form (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Mood Picker */}
              <Card className="border shadow-sm p-4 space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> حال و هوای امروزت چطوره؟
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMood(m.value)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center",
                        mood === m.value
                          ? cn(m.color, "ring-2 ring-primary ring-offset-2 scale-105 shadow-sm font-semibold")
                          : "hover:bg-muted/50 border-muted"
                      )}
                    >
                      <span className="text-2xl mb-1">{m.emoji}</span>
                      <span className="text-[10px] leading-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Gratitude & Highlights */}
              <Card className="border shadow-sm p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gratitude" className="text-sm font-semibold flex items-center gap-1.5 text-emerald-600">
                    <HeartHandshake className="h-4 w-4" /> سه موردی که بابت آن‌ها شکرگزارم:
                  </Label>
                  <Textarea
                    id="gratitude"
                    rows={2}
                    value={gratitude}
                    onChange={(e) => setGratitude(e.target.value)}
                    placeholder="۱. سلامتی خانواده&#10;۲. هوای خنک صبحگاهی&#10;۳. حل باگ سخت پروژه..."
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="highlights" className="text-sm font-semibold flex items-center gap-1.5 text-blue-600">
                    <Trophy className="h-4 w-4" /> پیروزی‌ها و دستاوردهای کوچک امروز:
                  </Label>
                  <Textarea
                    id="highlights"
                    rows={2}
                    value={highlights}
                    onChange={(e) => setHighlights(e.target.value)}
                    placeholder="چه کار مفیدی امروز انجام دادی؟..."
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                    <BookMarked className="h-4 w-4" /> یادداشت آزاد روزانه:
                  </Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="هر فکری، احساسی یا برنامه‌ای که توی ذهنته بنویس..."
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => {
                      const text = [notes, highlights, gratitude].filter(Boolean).join("\n");
                      startTransition(async () => {
                        try {
                          const res = await fetch("/api/journal", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "extract-tasks",
                              text,
                              create: true,
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error("fail");
                          toast.success(
                            data.tasks?.length
                              ? `${data.tasks.length} تسک از ژورنال ساخته شد`
                              : "تسکی پیدا نشد"
                          );
                        } catch {
                          toast.error("استخراج تسک ناموفق بود");
                        }
                      });
                    }}
                  >
                    ساخت تسک از متن
                  </Button>
                  <Button type="submit" disabled={isPending} className="px-6 font-semibold">
                    {isPending ? "در حال ذخیره..." : "ذخیره ژورنال"}
                  </Button>
                </div>
              </Card>
            </form>
          </div>

          {/* Past Entries List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> روزهای ثبت‌شده اخیر
            </h3>
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="جستجو در متن ژورنال…"
              className="text-sm"
            />

            {pastEntries.length === 0 ? (
              <Card className="p-6 text-center text-xs text-muted-foreground border">
                هنوز ژورنالی ثبت نکرده‌اید.
              </Card>
            ) : (
              <div className="space-y-2.5">
                {pastEntries.map((entry) => {
                  const m = MOODS.find((item) => item.value === entry.mood);
                  return (
                    <Card
                      key={entry.id}
                      className={cn(
                        "p-3 border shadow-sm cursor-pointer hover:border-primary/50 transition-all text-xs",
                        date === entry.date && "ring-1 ring-primary bg-primary/5"
                      )}
                      onClick={() => setDate(entry.date)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{entry.date}</span>
                        <span className="text-base">{m?.emoji ?? "😊"}</span>
                      </div>
                      {entry.gratitude && (
                        <p className="text-muted-foreground line-clamp-1 truncate">
                          💚 {entry.gratitude}
                        </p>
                      )}
                      {entry.highlights && (
                        <p className="text-muted-foreground line-clamp-1 truncate">
                          🏆 {entry.highlights}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
