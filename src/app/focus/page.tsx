"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, Play, Pause, RotateCcw, CheckCircle2, Flame, Brain, Code2, BookOpen, Coffee } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [sessions, setSessions] = useState<any[]>([]);

  const todayStr = new Date().toISOString().split("T")[0];
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    loadStats();
  }, []);

  const switchMode = (newMode: keyof typeof MODES) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODES[newMode].minutes * 60);
  };

  const handleCompleteSession = async () => {
    playBeep();
    if (mode === "work") {
      try {
        await fetch("/api/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskName: taskName || "کار متمرکز",
            durationMinutes: 25,
            category,
            date: todayStr,
          }),
        });
        toast.success("آفرین! یک پومودوروی ۲۵ دقیقه‌ای ثبت شد 🎯");
        loadStats();
      } catch {}
      switchMode("shortBreak");
    } else {
      toast.info("استراحت تمام شد، بریم برای پومودوروی بعدی!");
      switchMode("work");
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleCompleteSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, taskName, category]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
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
          <div className="flex justify-center gap-2 mb-8">
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
              <Select value={category} onValueChange={(v: any) => setCategory(v)}>
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
