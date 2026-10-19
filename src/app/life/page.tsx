"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import {
  TODO_AREAS,
  TODO_PRIORITIES,
  ROUTINE_FREQUENCIES,
  WEEKDAY_LABELS,
} from "@/lib/constants";
import { formatJalaliDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  CheckCircle2,
  Circle,
  Sunrise,
  ListTodo,
  Flame,
  CalendarClock,
  CalendarDays,
  Trash2,
  Pencil,
} from "lucide-react";
import { TodoWeekView } from "@/components/life/todo-week-view";

interface LifeSummary {
  todos: { total: number; today: number; overdue: number; done: number };
  routines: { total: number; dueToday: number; completedToday: number; maxStreak: number };
  todayProgress: number;
}

interface Todo {
  id: string;
  title: string;
  description: string | null;
  area: keyof typeof TODO_AREAS;
  priority: keyof typeof TODO_PRIORITIES;
  status: "active" | "done";
  dueDate: string | null;
}

interface Routine {
  id: string;
  name: string;
  description: string | null;
  frequency: keyof typeof ROUTINE_FREQUENCIES;
  weeklyDays: number[];
  timeOfDay: string | null;
  color: string;
  completedToday: boolean;
  dueToday: boolean;
  streak: number;
}

type TodoFilter = "active" | "today" | "overdue" | "done" | "all";

export default function LifePage() {
  const [tab, setTab] = useState("todos");
  const [summary, setSummary] = useState<LifeSummary | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [todoFilter, setTodoFilter] = useState<TodoFilter>("active");
  const [todoView, setTodoView] = useState<"list" | "week">("list");
  const [todoOpen, setTodoOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [todoForm, setTodoForm] = useState({
    title: "",
    description: "",
    area: "personal" as Todo["area"],
    priority: "medium" as Todo["priority"],
    dueDate: "",
  });
  const [routineForm, setRoutineForm] = useState({
    name: "",
    description: "",
    frequency: "daily" as Routine["frequency"],
    timeOfDay: "",
    color: "#8b5cf6",
    weeklyDays: [0, 1, 2, 3, 4, 5, 6] as number[],
  });

  const resetTodoForm = () =>
    setTodoForm({
      title: "",
      description: "",
      area: "personal",
      priority: "medium",
      dueDate: "",
    });

  const resetRoutineForm = () =>
    setRoutineForm({
      name: "",
      description: "",
      frequency: "daily",
      timeOfDay: "",
      color: "#8b5cf6",
      weeklyDays: [0, 1, 2, 3, 4, 5, 6],
    });

  const loadSummary = () =>
    fetch("/api/routines?summary=1")
      .then((r) => r.json())
      .then(setSummary);

  const loadTodos = () =>
    fetch(`/api/todos?filter=${todoFilter}`)
      .then((r) => r.json())
      .then(setTodos);

  const loadRoutines = () =>
    fetch("/api/routines")
      .then((r) => r.json())
      .then(setRoutines);

  const refresh = () => {
    loadSummary();
    loadTodos();
    loadRoutines();
  };

  useEffect(() => {
    loadSummary();
    loadRoutines();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/todos?filter=${todoFilter}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error("Load failed"); return r.json(); })
      .then(setTodos).catch(() => { if (!controller.signal.aborted) toast.error("دریافت کارها انجام نشد"); });
    return () => controller.abort();
  }, [todoFilter]);

  const openCreateTodo = () => {
    setEditingTodo(null);
    resetTodoForm();
    setTodoOpen(true);
  };

  const openEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setTodoForm({
      title: todo.title,
      description: todo.description ?? "",
      area: todo.area,
      priority: todo.priority,
      dueDate: todo.dueDate ? String(todo.dueDate).slice(0, 10) : "",
    });
    setTodoOpen(true);
  };

  const openCreateRoutine = () => {
    setEditingRoutine(null);
    resetRoutineForm();
    setRoutineOpen(true);
  };

  const openEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setRoutineForm({
      name: routine.name,
      description: routine.description ?? "",
      frequency: routine.frequency,
      timeOfDay: routine.timeOfDay ?? "",
      color: routine.color,
      weeklyDays: routine.weeklyDays?.length
        ? routine.weeklyDays
        : [0, 1, 2, 3, 4, 5, 6],
    });
    setRoutineOpen(true);
  };

  const submitTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: todoForm.title,
      description: todoForm.description || null,
      area: todoForm.area,
      priority: todoForm.priority,
      dueDate: todoForm.dueDate || null,
    };

    if (editingTodo) {
      const res = await fetch(`/api/todos/${editingTodo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return toast.error("خطا در ویرایش");
      toast.success("کار به‌روز شد");
    } else {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return toast.error("خطا در ثبت کار");
      toast.success("کار اضافه شد");
    }

    setTodoOpen(false);
    setEditingTodo(null);
    resetTodoForm();
    refresh();
  };

  const submitRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: routineForm.name,
      description: routineForm.description || null,
      frequency: routineForm.frequency,
      timeOfDay: routineForm.timeOfDay || null,
      color: routineForm.color,
      weeklyDays:
        routineForm.frequency === "weekly" ? routineForm.weeklyDays : null,
    };

    if (editingRoutine) {
      const res = await fetch(`/api/routines/${editingRoutine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return toast.error("خطا در ویرایش");
      toast.success("عادت به‌روز شد");
    } else {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          weeklyDays:
            routineForm.frequency === "weekly"
              ? routineForm.weeklyDays
              : undefined,
        }),
      });
      if (!res.ok) return toast.error("خطا در ثبت عادت");
      toast.success("عادت اضافه شد");
    }

    setRoutineOpen(false);
    setEditingRoutine(null);
    resetRoutineForm();
    refresh();
  };

  const toggleTodo = async (todo: Todo) => {
    const status = todo.status === "active" ? "done" : "active";
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return toast.error("خطا");
    refresh();
  };

  const deleteTodo = async (id: string) => {
    const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("خطا");
    refresh();
  };

  const toggleRoutine = async (routine: Routine) => {
    const res = await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routineId: routine.id }),
    });
    if (!res.ok) return toast.error("خطا");
    refresh();
  };

  const deleteRoutine = async (id: string) => {
    const res = await fetch(`/api/routines/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("خطا");
    refresh();
  };

  const toggleWeekday = (day: number) => {
    setRoutineForm((f) => ({
      ...f,
      weeklyDays: f.weeklyDays.includes(day)
        ? f.weeklyDays.filter((d) => d !== day)
        : [...f.weeklyDays, day].sort(),
    }));
  };

  return (
    <>
      <Header title="زندگی" />
      <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto motion-stagger">
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-violet-500/10 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">پیشرفت امروز</p>
                    <p className="text-2xl font-bold">{summary.todayProgress}%</p>
                  </div>
                  <Sunrise className="h-8 w-8 text-violet-500" />
                </div>
                <Progress value={summary.todayProgress} className="mt-3 h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">کارهای باز</p>
                <p className="text-2xl font-bold">{summary.todos.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.todos.today} امروز · {summary.todos.overdue} عقب‌افتاده
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">عادت‌های امروز</p>
                <p className="text-2xl font-bold">
                  {summary.routines.completedToday}/{summary.routines.dueToday}
                </p>
                <p className="text-xs text-muted-foreground mt-1">انجام‌شده</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">بیشترین استریک</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    <Flame className="h-5 w-5 text-orange-500" />
                    {summary.routines.maxStreak}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">روز متوالی</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v);
            if (v !== "todos") setTodoView("list");
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="todos" className="gap-2">
                <ListTodo className="h-4 w-4" />
                کارها
              </TabsTrigger>
              <TabsTrigger value="routines" className="gap-2">
                <Sunrise className="h-4 w-4" />
                عادت‌ها
              </TabsTrigger>
            </TabsList>
            <Button
              onClick={() =>
                tab === "todos" ? openCreateTodo() : openCreateRoutine()
              }
              disabled={tab === "todos" && todoView === "week"}
            >
              <Plus className="h-4 w-4 ml-1" />
              {tab === "todos" ? "کار جدید" : "عادت جدید"}
            </Button>
          </div>

          <TabsContent value="todos" className="space-y-4 mt-4">
            {todoView === "week" ? (
              <TodoWeekView onBack={() => setTodoView("list")} />
            ) : (
              <>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["active", "باز"],
                  ["today", "امروز"],
                  ["overdue", "عقب‌افتاده"],
                  ["done", "انجام‌شده"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={todoFilter === key ? "default" : "outline"}
                  onClick={() => setTodoFilter(key)}
                >
                  {label}
                </Button>
              ))}
              <Button
                size="sm"
                variant="secondary"
                className="mr-auto gap-1.5"
                onClick={() => setTodoView("week")}
              >
                <CalendarDays className="h-4 w-4" />
                تقویم هفته
              </Button>
            </div>

            {todos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  کاری برای نمایش نیست. اولین کار را اضافه کنید.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {todos.map((todo) => (
                  <Card
                    key={todo.id}
                    className={cn(
                      "transition-opacity",
                      todo.status === "done" && "opacity-60"
                    )}
                  >
                    <CardContent className="py-4 flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTodo(todo)}
                        className="mt-0.5 text-primary"
                      >
                        {todo.status === "done" ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={cn(
                              "font-medium",
                              todo.status === "done" && "line-through"
                            )}
                          >
                            {todo.title}
                          </p>
                          <Badge
                            variant="secondary"
                            style={{
                              color: TODO_AREAS[todo.area].color,
                              backgroundColor: `${TODO_AREAS[todo.area].color}15`,
                            }}
                          >
                            {TODO_AREAS[todo.area].label}
                          </Badge>
                          <Badge
                            variant="outline"
                            style={{ borderColor: TODO_PRIORITIES[todo.priority].color }}
                          >
                            {TODO_PRIORITIES[todo.priority].label}
                          </Badge>
                        </div>
                        {todo.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {todo.description}
                          </p>
                        )}
                        {todo.dueDate && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {formatJalaliDate(todo.dueDate)}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditTodo(todo)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTodo(todo.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
              </>
            )}
          </TabsContent>

          <TabsContent value="routines" className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await fetch("/api/routines", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "complete-slot", slot: "morning" }),
                  });
                  const data = await res.json();
                  if (!res.ok) return toast.error("خطا");
                  toast.success(
                    data.completed
                      ? `${data.completed} روتین صبح تیک خورد`
                      : "روتین صبحی مطابق نبود / قبلاً انجام شده"
                  );
                  refresh();
                }}
              >
                <Sunrise className="h-4 w-4 ml-2" />
                روتین صبح — همه
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await fetch("/api/routines", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "complete-slot", slot: "night" }),
                  });
                  const data = await res.json();
                  if (!res.ok) return toast.error("خطا");
                  toast.success(
                    data.completed
                      ? `${data.completed} روتین شب تیک خورد`
                      : "روتین شبی مطابق نبود / قبلاً انجام شده"
                  );
                  refresh();
                }}
              >
                روتین شب — همه
              </Button>
            </div>
            {routines.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  هنوز عادتی تعریف نشده. ورزش، مطالعه، خواب منظم — از همین‌جا شروع کنید.
                  برای دکمهٔ صبح/شب، در نام روتین «صبح» یا «شب» بگذار.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {routines.map((routine) => (
                  <Card
                    key={routine.id}
                    className={cn(
                      "overflow-hidden",
                      routine.completedToday && "ring-2 ring-emerald-500/30"
                    )}
                  >
                    <div
                      className="h-1.5"
                      style={{ backgroundColor: routine.color }}
                    />
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{routine.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ROUTINE_FREQUENCIES[routine.frequency].label}
                            {routine.timeOfDay ? ` · ${routine.timeOfDay}` : ""}
                          </p>
                        </div>
                        {routine.streak > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Flame className="h-3 w-3 text-orange-500" />
                            {routine.streak}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {routine.description && (
                        <p className="text-sm text-muted-foreground">
                          {routine.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {routine.dueToday
                            ? routine.completedToday
                              ? "امروز انجام شد ✓"
                              : "امروز باید انجام شود"
                            : "امروز برنامه‌ای نیست"}
                        </span>
                        <div className="flex gap-2">
                          {routine.dueToday && (
                            <Button
                              size="sm"
                              variant={routine.completedToday ? "secondary" : "default"}
                              onClick={() => toggleRoutine(routine)}
                            >
                              {routine.completedToday ? "لغو" : "انجام شد"}
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditRoutine(routine)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteRoutine(routine.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={todoOpen}
        onOpenChange={(v) => {
          setTodoOpen(v);
          if (!v) setEditingTodo(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTodo ? "ویرایش کار" : "کار جدید"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitTodo} className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان</Label>
              <Input
                value={todoForm.title}
                onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>توضیح (اختیاری)</Label>
              <Textarea
                value={todoForm.description}
                onChange={(e) =>
                  setTodoForm({ ...todoForm, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>حوزه</Label>
                <Select
                  value={todoForm.area}
                  onValueChange={(v) =>
                    setTodoForm({ ...todoForm, area: v as Todo["area"] })
                  }
                  items={Object.fromEntries(
                    Object.entries(TODO_AREAS).map(([k, v]) => [k, v.label])
                  )}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TODO_AREAS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اولویت</Label>
                <Select
                  value={todoForm.priority}
                  onValueChange={(v) =>
                    setTodoForm({ ...todoForm, priority: v as Todo["priority"] })
                  }
                  items={Object.fromEntries(
                    Object.entries(TODO_PRIORITIES).map(([k, v]) => [k, v.label])
                  )}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TODO_PRIORITIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>موعد (اختیاری)</Label>
              <JalaliDatePicker
                value={todoForm.dueDate}
                onChange={(v) => setTodoForm({ ...todoForm, dueDate: v })}
              />
            </div>
            <Button type="submit" className="w-full">
              ذخیره
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={routineOpen}
        onOpenChange={(v) => {
          setRoutineOpen(v);
          if (!v) setEditingRoutine(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoutine ? "ویرایش عادت" : "عادت جدید"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitRoutine} className="space-y-4">
            <div className="space-y-2">
              <Label>نام</Label>
              <Input
                value={routineForm.name}
                onChange={(e) => setRoutineForm({ ...routineForm, name: e.target.value })}
                placeholder="مثلاً ورزش صبحگاهی"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>توضیح (اختیاری)</Label>
              <Textarea
                value={routineForm.description}
                onChange={(e) =>
                  setRoutineForm({ ...routineForm, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>تکرار</Label>
                <Select
                  value={routineForm.frequency}
                  onValueChange={(v) =>
                    setRoutineForm({
                      ...routineForm,
                      frequency: v as Routine["frequency"],
                    })
                  }
                  items={Object.fromEntries(
                    Object.entries(ROUTINE_FREQUENCIES).map(([k, v]) => [k, v.label])
                  )}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROUTINE_FREQUENCIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ساعت (اختیاری)</Label>
                <Input
                  type="time"
                  value={routineForm.timeOfDay}
                  onChange={(e) =>
                    setRoutineForm({ ...routineForm, timeOfDay: e.target.value })
                  }
                />
              </div>
            </div>
            {routineForm.frequency === "weekly" && (
              <div className="space-y-2">
                <Label>روزهای هفته</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_LABELS.map((label, day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={
                        routineForm.weeklyDays.includes(day) ? "default" : "outline"
                      }
                      onClick={() => toggleWeekday(day)}
                    >
                      {label.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <Button type="submit" className="w-full">
              ذخیره
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
