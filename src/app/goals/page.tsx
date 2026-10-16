"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Target, ShoppingBag, PiggyBank, Pencil, Trash2 } from "lucide-react";
import { formatToman, formatJalaliDate } from "@/lib/format";
import { AmountInput } from "@/components/amount-input";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { toast } from "sonner";

interface Goal {
  id: string;
  type: "savings" | "purchase";
  name: string;
  targetAmount: number;
  currentAmount: number;
  percent: number;
  remaining: number;
  color: string;
  deadline: string | null;
  status: string;
}

const emptyForm = {
  name: "",
  targetAmount: "",
  deadline: "",
  color: "#10b981",
};

export default function GoalsPage() {
  const confirm = useConfirm();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contribOpen, setContribOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"savings" | "purchase">("savings");
  const [form, setForm] = useState(emptyForm);
  const [contrib, setContrib] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const load = () =>
    fetch("/api/goals")
      .then((r) => r.json())
      .then(setGoals);

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      color: tab === "savings" ? "#10b981" : "#3b82f6",
    });
    setOpen(true);
  };

  const openEdit = (g: Goal) => {
    setEditing(g);
    setForm({
      name: g.name,
      targetAmount: String(g.targetAmount),
      deadline: g.deadline ? g.deadline.slice(0, 10) : "",
      color: g.color,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      targetAmount: parseInt(form.targetAmount.replace(/,/g, "")),
      deadline: form.deadline || null,
      color: form.color,
    };

    if (editing) {
      const res = await fetch(`/api/goals/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return toast.error("خطا در ویرایش");
      toast.success("هدف به‌روز شد");
    } else {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, type: tab }),
      });
      if (!res.ok) return toast.error("خطا در ثبت");
      toast.success("هدف جدید اضافه شد");
    }

    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (g: Goal) => {
    const ok = await confirm({
      title: "حذف هدف",
      description: `هدف «${g.name}» حذف شود؟`,
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/goals/${g.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("خطا در حذف");
    toast.success("هدف حذف شد");
    load();
  };

  const submitContrib = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribOpen) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goalId: contribOpen,
        amount: parseInt(contrib.amount.replace(/,/g, "")),
        date: contrib.date,
      }),
    });
    if (res.ok) {
      toast.success("واریز ثبت شد");
      setContribOpen(null);
      setContrib({ amount: "", date: new Date().toISOString().split("T")[0] });
      load();
    }
  };

  const filtered = goals.filter((g) => g.type === tab && g.status === "active");

  return (
    <>
      <Header title="اهداف" />
      <div className="p-4 lg:p-8 space-y-6 motion-stagger">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "savings" | "purchase")}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="savings" className="gap-2">
                <PiggyBank className="h-4 w-4" />
                پس‌انداز
              </TabsTrigger>
              <TabsTrigger value="purchase" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                خرید
              </TabsTrigger>
            </TabsList>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 ml-2" />
              هدف جدید
            </Button>
          </div>

          <TabsContent value="savings" className="space-y-4 mt-4">
            {filtered.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onContribute={() => setContribOpen(g.id)}
                onEdit={() => openEdit(g)}
                onDelete={() => remove(g)}
              />
            ))}
            {filtered.length === 0 && (
              <EmptyState
                title="هنوز هدف پس‌انداز ندارید"
                description="یک هدف مشخص کنید و به‌تدریج برایش پس‌انداز کنید."
                actionLabel="هدف جدید"
                onAction={openCreate}
                icon={<PiggyBank className="h-5 w-5" />}
              />
            )}
          </TabsContent>
          <TabsContent value="purchase" className="space-y-4 mt-4">
            {filtered.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onContribute={() => setContribOpen(g.id)}
                onEdit={() => openEdit(g)}
                onDelete={() => remove(g)}
              />
            ))}
            {filtered.length === 0 && (
              <EmptyState
                title="هنوز هدف خرید ندارید"
                description="چیزی که می‌خواهید بخرید را هدف کنید."
                actionLabel="هدف جدید"
                onAction={openCreate}
                icon={<ShoppingBag className="h-5 w-5" />}
              />
            )}
          </TabsContent>
        </Tabs>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing
                  ? "ویرایش هدف"
                  : `هدف ${tab === "savings" ? "پس‌انداز" : "خرید"} جدید`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>نام هدف</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={
                    tab === "savings" ? "مثلاً پس‌انداز اضطراری" : "مثلاً لپ‌تاپ جدید"
                  }
                  required
                />
              </div>
              <div>
                <Label>مبلغ هدف (تومان)</Label>
                <AmountInput
                  value={form.targetAmount}
                  onValueChange={(v) =>
                    setForm({ ...form, targetAmount: v })
                  }
                  required
                />
              </div>
              <div>
                <Label>مهلت (اختیاری)</Label>
                <JalaliDatePicker
                  value={form.deadline}
                  onChange={(d) => setForm({ ...form, deadline: d })}
                />
              </div>
              <Button type="submit" className="w-full">
                ذخیره
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!contribOpen} onOpenChange={() => setContribOpen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>واریز به هدف</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitContrib} className="space-y-4">
              <div>
                <Label>مبلغ (تومان)</Label>
                <AmountInput
                  value={contrib.amount}
                  onValueChange={(v) =>
                    setContrib({ ...contrib, amount: v })
                  }
                  required
                />
              </div>
              <div>
                <Label>تاریخ</Label>
                <JalaliDatePicker
                  value={contrib.date}
                  onChange={(d) => setContrib({ ...contrib, date: d })}
                />
              </div>
              <Button type="submit" className="w-full">
                ثبت واریز
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onContribute: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
              style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
            >
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{goal.name}</p>
              {goal.deadline && (
                <p className="text-xs text-muted-foreground">
                  مهلت: {formatJalaliDate(goal.deadline)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className="text-sm font-bold tabular-nums ml-1"
              style={{ color: goal.color }}
            >
              {goal.percent}%
            </span>
            <Button size="sm" variant="outline" onClick={onContribute}>
              واریز
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span>{formatToman(goal.currentAmount)}</span>
          <span className="text-muted-foreground">
            {formatToman(goal.targetAmount)}
          </span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${goal.percent}%`, backgroundColor: goal.color }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          باقیمانده: {formatToman(goal.remaining)}
        </p>
      </CardContent>
    </Card>
  );
}


