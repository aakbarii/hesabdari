"use client";
import { useRecordsRefresh } from "@/components/use-records-refresh";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Plus,
  Banknote,
  Landmark,
  CreditCard,
  Wallet,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatToman } from "@/lib/format";
import { ACCOUNT_TYPES, ACCOUNT_COLORS } from "@/lib/constants";
import { toast } from "sonner";
import { AmountInput } from "@/components/amount-input";
import { StatCard } from "@/components/stat-card";

interface Account {
  id: string;
  name: string;
  type: keyof typeof ACCOUNT_TYPES;
  color: string;
  balance: number;
  isActive: boolean;
}

const typeIcons = {
  cash: Banknote,
  bank: Landmark,
  card: CreditCard,
  wallet: Wallet,
};

const emptyForm = {
  name: "",
  type: "cash" as Account["type"],
  color: ACCOUNT_COLORS[0],
  balance: "",
};

export default function AccountsPage() {
  useRecordsRefresh(() => { void load(); });
  const confirm = useConfirm();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () =>
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts);

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditing(acc);
    setForm({
      name: acc.name,
      type: acc.type,
      color: acc.color,
      balance: String(acc.balance),
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseInt(form.balance.replace(/,/g, "")) || 0;

    if (editing) {
      const res = await fetch(`/api/accounts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          color: form.color,
          balance,
        }),
      });
      if (!res.ok) return toast.error("خطا در ویرایش");
      toast.success("حساب به‌روز شد");
    } else {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          color: form.color,
          initialBalance: balance,
        }),
      });
      if (!res.ok) return toast.error("خطا در ثبت حساب");
      toast.success("حساب جدید اضافه شد");
    }

    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (acc: Account) => {
    const ok = await confirm({
      title: "حذف حساب",
      description: `حساب «${acc.name}» حذف شود؟ این کار برگشت‌پذیر نیست.`,
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/accounts/${acc.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("خطا در حذف");
    toast.success("حساب حذف شد");
    load();
  };

  const total = accounts.reduce((s, a) => s + (a.isActive ? a.balance : 0), 0);

  return (
    <>
      <Header title="حساب‌ها" />
      <div className="p-4 lg:p-8 space-y-6 motion-stagger">
        <PageHero
          heroKey="accounts"
          title="حساب‌ها"
          subtitle="مدیریت حساب‌های بانکی، نقد و کیف پول"
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 ml-2" />
              حساب جدید
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="مجموع موجودی" value={formatToman(total)} hint={`${accounts.length} حساب فعال`} icon={<Wallet />} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => {
            const Icon = typeIcons[acc.type];
            return (
              <Card key={acc.id} className="motion-lift">
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
                        style={{
                          backgroundColor: `${acc.color}20`,
                          color: acc.color,
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ACCOUNT_TYPES[acc.type].label}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="ویرایش"
                        onClick={() => openEdit(acc)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="حذف"
                        onClick={() => remove(acc)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-5 text-xs text-muted-foreground">موجودی</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
                    {formatToman(acc.balance)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {accounts.length === 0 && (
          <EmptyState
            title="هنوز حسابی ندارید"
            description="اولین حساب بانکی یا نقدی را بسازید تا موجودی‌ها اینجا دیده شوند."
            actionLabel="افزودن حساب"
            onAction={openCreate}
            icon={<Wallet className="h-5 w-5" />}
          />
        )}
      </div>

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
              {editing ? "ویرایش حساب" : "افزودن حساب"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>نام حساب</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثلاً بانک ملت"
                required
              />
            </div>
            <div>
              <Label>نوع</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: (v ?? "cash") as Account["type"] })
                }
                items={Object.fromEntries(
                  Object.entries(ACCOUNT_TYPES).map(([k, v]) => [k, v.label])
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                {editing ? "موجودی فعلی (تومان)" : "موجودی اولیه (تومان)"}
              </Label>
              <AmountInput
                value={form.balance}
                onValueChange={(v) => setForm({ ...form, balance: v })}
                placeholder="0"
              />
              {editing && (
                <p className="text-xs text-muted-foreground mt-1">
                  با تغییر این عدد، موجودی حساب اصلاح می‌شود.
                </p>
              )}
            </div>
            <div>
              <Label>رنگ</Label>
              <div className="flex gap-2 mt-2">
                {ACCOUNT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      form.color === c
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full">
              ذخیره
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
