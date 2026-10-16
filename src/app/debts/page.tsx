"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, HandCoins, ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { formatToman, formatJalaliDate } from "@/lib/format";
import { AmountInput } from "@/components/amount-input";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { toast } from "sonner";

interface Debt {
  id: string;
  personName: string;
  type: "owed" | "owing";
  totalAmount: number;
  paidAmount: number;
  description: string | null;
  dueDate: string | null;
  status: string;
}

const emptyForm = {
  personName: "",
  type: "owing" as "owed" | "owing",
  totalAmount: "",
  description: "",
  dueDate: "",
};

export default function DebtsPage() {
  const confirm = useConfirm();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [paymentOpen, setPaymentOpen] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const load = () =>
    fetch("/api/debts")
      .then((r) => r.json())
      .then(setDebts);

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (d: Debt) => {
    setEditing(d);
    setForm({
      personName: d.personName,
      type: d.type,
      totalAmount: String(d.totalAmount),
      description: d.description ?? "",
      dueDate: d.dueDate ? String(d.dueDate).slice(0, 10) : "",
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      personName: form.personName,
      type: form.type,
      totalAmount: parseInt(form.totalAmount.replace(/,/g, "")),
      description: form.description || null,
      dueDate: form.dueDate || null,
    };

    if (editing) {
      const res = await fetch(`/api/debts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return toast.error(err.error || "خطا در ویرایش");
      }
      toast.success("به‌روز شد");
    } else {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return toast.error("خطا در ثبت");
      toast.success("ثبت شد");
    }

    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (d: Debt) => {
    const ok = await confirm({
      title: "حذف بدهی/طلب",
      description: `«${d.personName}» حذف شود؟`,
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/debts/${d.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("خطا در حذف");
    toast.success("حذف شد");
    load();
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentOpen) return;
    const res = await fetch("/api/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        debtId: paymentOpen,
        amount: parseInt(paymentForm.amount.replace(/,/g, "")),
        date: paymentForm.date,
      }),
    });
    if (res.ok) {
      toast.success("پرداخت ثبت شد");
      setPaymentOpen(null);
      setPaymentForm({ amount: "", date: new Date().toISOString().split("T")[0] });
      load();
    }
  };

  const owed = debts.filter((d) => d.type === "owed" && d.status === "active");
  const owing = debts.filter((d) => d.type === "owing" && d.status === "active");
  const totalOwed = owed.reduce((s, d) => s + (d.totalAmount - d.paidAmount), 0);
  const totalOwing = owing.reduce(
    (s, d) => s + (d.totalAmount - d.paidAmount),
    0
  );

  return (
    <>
      <Header title="بدهی و طلب" />
      <div className="p-4 lg:p-8 space-y-6 motion-stagger">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <ArrowDownLeft className="h-4 w-4" />
                <span className="text-sm">طلب از دیگران</span>
              </div>
              <p className="text-2xl font-bold">{formatToman(totalOwed)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm">بدهی به دیگران</span>
              </div>
              <p className="text-2xl font-bold">{formatToman(totalOwing)}</p>
            </CardContent>
          </Card>
        </div>

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 ml-2" />
          ثبت بدهی/طلب
        </Button>

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
                {editing ? "ویرایش بدهی/طلب" : "ثبت بدهی یا طلب"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>نام شخص</Label>
                <Input
                  value={form.personName}
                  onChange={(e) =>
                    setForm({ ...form, personName: e.target.value })
                  }
                  required
                />
              </div>
              <Tabs
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: (v ?? "owing") as "owed" | "owing" })
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="owing">بدهکارم</TabsTrigger>
                  <TabsTrigger value="owed">طلبکارم</TabsTrigger>
                </TabsList>
              </Tabs>
              <div>
                <Label>مبلغ کل (تومان)</Label>
                <AmountInput
                  value={form.totalAmount}
                  onValueChange={(v) =>
                    setForm({ ...form, totalAmount: v })
                  }
                  required
                />
              </div>
              <div>
                <Label>سررسید</Label>
                <JalaliDatePicker
                  value={form.dueDate}
                  onChange={(d) => setForm({ ...form, dueDate: d })}
                />
              </div>
              <div>
                <Label>توضیحات</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full">
                ذخیره
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">فعال</TabsTrigger>
            <TabsTrigger value="settled">تسویه‌شده</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-3 mt-4">
            {debts.filter((d) => d.status === "active").length === 0 ? (
              <EmptyState
                title="بدهی فعالی نیست"
                description="بدهی یا طلب جدید ثبت کنید تا اینجا دیده شود."
                actionLabel="ثبت بدهی/طلب"
                onAction={() => { setEditing(null); setForm(emptyForm); setOpen(true); }}
                icon={<HandCoins className="h-5 w-5" />}
              />
            ) : (
              debts
                .filter((d) => d.status === "active")
                .map((d) => (
                  <DebtCard
                    key={d.id}
                    debt={d}
                    onPay={() => setPaymentOpen(d.id)}
                    onEdit={() => openEdit(d)}
                    onDelete={() => remove(d)}
                  />
                ))
            )}
          </TabsContent>
          <TabsContent value="settled" className="space-y-3 mt-4">
            {debts.filter((d) => d.status === "settled").length === 0 ? (
              <EmptyState title="هنوز مورد تسویه‌شده‌ای نیست" />
            ) : (
              debts
                .filter((d) => d.status === "settled")
                .map((d) => (
                  <DebtCard
                    key={d.id}
                    debt={d}
                    onEdit={() => openEdit(d)}
                    onDelete={() => remove(d)}
                  />
                ))
            )}
          </TabsContent>
        </Tabs>

        <Dialog
          open={!!paymentOpen}
          onOpenChange={() => setPaymentOpen(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ثبت پرداخت</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitPayment} className="space-y-4">
              <div>
                <Label>مبلغ (تومان)</Label>
                <AmountInput
                  value={paymentForm.amount}
                  onValueChange={(v) =>
                    setPaymentForm({ ...paymentForm, amount: v })
                  }
                  required
                />
              </div>
              <div>
                <Label>تاریخ</Label>
                <JalaliDatePicker
                  value={paymentForm.date}
                  onChange={(d) =>
                    setPaymentForm({ ...paymentForm, date: d })
                  }
                />
              </div>
              <Button type="submit" className="w-full">
                ثبت پرداخت
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

function DebtCard({
  debt,
  onPay,
  onEdit,
  onDelete,
}: {
  debt: Debt;
  onPay?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const remaining = debt.totalAmount - debt.paidAmount;
  const percent = Math.min(
    100,
    Math.round((debt.paidAmount / debt.totalAmount) * 100)
  );
  const progressColor =
    debt.type === "owed"
      ? "[&_[data-slot=progress-indicator]]:bg-emerald-500"
      : "[&_[data-slot=progress-indicator]]:bg-red-500";

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                debt.type === "owed"
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              <HandCoins className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{debt.personName}</p>
              <p className="text-xs text-muted-foreground">
                {debt.type === "owed" ? "طلب" : "بدهی"}
                {debt.dueDate && ` · سررسید: ${formatJalaliDate(debt.dueDate)}`}
              </p>
              {debt.description && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {debt.description}
                </p>
              )}
            </div>
          </div>
          <div className="text-left flex flex-col items-end gap-2 shrink-0">
            <p className="font-bold">{formatToman(remaining)}</p>
            <div className="flex items-center gap-1">
              {debt.status === "active" && onPay && (
                <Button size="sm" variant="outline" onClick={onPay}>
                  ثبت پرداخت
                </Button>
              )}
              {debt.status === "settled" && (
                <Badge variant="secondary">تسویه شده</Badge>
              )}
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatToman(debt.paidAmount)} پرداخت شده</span>
            <span>{percent}%</span>
          </div>
          <Progress value={percent} className={`h-2.5 ${progressColor}`} />
        </div>
      </CardContent>
    </Card>
  );
}
