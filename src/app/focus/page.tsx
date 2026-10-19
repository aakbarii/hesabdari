"use client";

import { toISODate } from "@/lib/format";

import { useState, useEffect, useRef, useEffectEvent } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {  Play, Pause, RotateCcw, CheckCircle2, Flame, Brain,   } from "lucide-react";
import { toast } from "sonner";


const MODES = {
  work: { label: "کار عمیق", minutes: 25, color: "text-primary" },
  shortBreak: { label: "استراحت کوتاه", minutes: 5, color: "text-emerald-500" },
  longBreak: { label: "استراحت طولانی", minutes: 15, color: "text-blue-500" },
};

export default function FocusPage() {
  const [mode, setMode] = useState<keyof typeof MODES>("work");
  const [timeLeft, setTimeLeft] = useState(MODES.work.minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [taskName, setTaskName] = useState("توسعه فرانت‌اند و کدنویسی");
  const [category, setCategory] = useState<"coding" | "work" | "study" | "personal">("coding");

  const [stats, setStats] = useState({ sessionCount: 0, totalMinutes: 0 });
  const [sessions, setSessions] = useState<Array<{ id: string; taskName: string; durationMinutes: number; category: string; createdAt: string }>>([]);

  const todayStr = toISODate(new Date());
  const deadlineRef = useRef<number | null>(null);

  const playBeep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
      osc.onended = () => { void ctx.close(); };
    } catch {}
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/focus?date=${todayStr}`);
      if (res.ok) {
        const json = await res.json();
        setStats({ sessionCount: json.sessionCount, totalMinutes: json.totalMinutes });
        setSessions(json.sessions);
      }
    } catch {}
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/focus?date=${todayStr}`, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error("Load failed"); return res.json(); })
      .then((json) => { setStats({ sessionCount: json.sessionCount, totalMinutes: json.totalMinutes }); setSessions(json.sessions); })
      .catch(() => { if (!controller.signal.aborted) toast.error("دریافت جلسات تمرکز انجام نشد"); });
    return () => controller.abort();
  }, [todayStr]);

  const switchMode = (newMode: keyof typeof MODES) => {
    deadlineRef.current = null;
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODES[newMode].minutes * 60);
  };

  const handleCompleteSession = async () => {
    playBeep();
    if (mode === "work") {
      try {
        const response = await fetch("/api/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskName: taskName || "کار متمرکز",
            durationMinutes: 25,
            category,
            date: todayStr,
          }),
        });
        if (!response.ok) throw new Error("Save failed");
        toast.success("آفرین! یک پومودوروی ۲۵ دقیقه‌ای ثبت شد 🎯");
        loadStats();
      } catch { toast.error("ثبت جلسه انجام نشد. اتصال به سرور را بررسی کنید."); }
      switchMode("shortBreak");
    } else {
      toast.info("استراحت تمام شد، بریم برای پومودوروی بعدی!");
      switchMode("work");
    }
  };

  const onComplete = useEffectEvent(() => { void handleCompleteSession(); });

  useEffect(() => {
    if (!isRunning) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        deadlineRef.current = null;
        setIsRunning(false);
        onComplete();
      }
    };
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [isRunning]);

  const toggleTimer = () => {
    if (isRunning) {
      setTimeLeft(Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000)));
      deadlineRef.current = null;
      setIsRunning(false);
    } else {
      deadlineRef.current = Date.now() + timeLeft * 1000;
      setIsRunning(true);
    }
  };
  const resetTimer = () => {
    deadlineRef.current = null;
    setIsRunning(false);
    setTimeLeft(MODES[mode].minutes * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = ((MODES[mode].minutes * 60 - timeLeft) / (MODES[mode].minutes * 60)) * 100;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <Header title="حالت تمرکز و پومودورو" />

      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border shadow-sm text-center p-4">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> جلسات پومودورو امروز
            </p>
            <p className="text-3xl font-extrabold mt-1 text-primary">{stats.sessionCount.toLocaleString("fa-IR")}</p>
          </Card>
          <Card className="border shadow-sm text-center p-4">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Brain className="h-4 w-4 text-blue-500" /> زمان کار عمیق امروز
            </p>
            <p className="text-3xl font-extrabold mt-1 text-blue-600">
              {stats.totalMinutes.toLocaleString("fa-IR")} <span className="text-sm font-normal text-muted-foreground">دقیقه</span>
            </p>
          </Card>
        </div>

        {/* Main Pomodoro Clock Card */}
        <Card className="border shadow-md overflow-hidden text-center p-6 sm:p-10 relative">
          {/* Mode Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Button
              size="sm"
              variant={mode === "work" ? "default" : "outline"}
              onClick={() => switchMode("work")}
              className="rounded-full px-5"
            >
              🎯 کار عمیق (۲۵)
            </Button>
            <Button
              size="sm"
              variant={mode === "shortBreak" ? "default" : "outline"}
              onClick={() => switchMode("shortBreak")}
              className="rounded-full px-4"
            >
              ☕ استراحت کوتاه (۵)
            </Button>
            <Button
              size="sm"
              variant={mode === "longBreak" ? "default" : "outline"}
              onClick={() => switchMode("longBreak")}
              className="rounded-full px-4"
            >
              🌿 استراحت بلند (۱۵)
            </Button>
          </div>

          {/* Big Digital Clock */}
          <div className="my-8">
            <span className="font-mono text-7xl sm:text-8xl font-black tracking-tight drop-shadow-sm">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>

          {/* Progress Bar under clock */}
          <div className="w-full max-w-md mx-auto bg-muted h-2 rounded-full overflow-hidden mb-8">
            <div
              className="h-full bg-primary transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex justify-center items-center gap-4 mb-6">
            <Button size="lg" className="h-14 px-8 text-lg font-bold gap-2 rounded-full shadow-md" onClick={toggleTimer}>
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {isRunning ? "توقف موقت" : "شروع تمرکز"}
            </Button>
            <Button size="icon" variant="outline" className="h-12 w-12 rounded-full" onClick={resetTimer}>
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>

          {/* Task Title & Category */}
          {mode === "work" && (
            <div className="max-w-md mx-auto pt-4 border-t flex flex-col sm:flex-row gap-2">
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="عنوان کار متمرکز..."
                className="text-center sm:text-right"
              />
              <Select value={category} onValueChange={(v) => { if (v === "coding" || v === "work" || v === "study" || v === "personal") setCategory(v); }}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coding">💻 کدنویسی</SelectItem>
                  <SelectItem value="work">💼 کار</SelectItem>
                  <SelectItem value="study">📚 مطالعه</SelectItem>
                  <SelectItem value="personal">🌱 شخصی</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </Card>

        {/* Recent Focus Log */}
        {sessions.length > 0 && (
          <Card className="border shadow-sm p-4">
            <CardHeader className="p-2 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" /> جلسات تکمیل‌شده امروز
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold">{s.taskName}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {s.category === "coding" ? "کدنویسی" : s.category === "work" ? "کار" : "مطالعه"}
                    </Badge>
                  </div>
                  <span className="font-mono text-muted-foreground">{s.durationMinutes} دقیقه</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
