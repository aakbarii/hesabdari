"use client";

import { useEffect, useState, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Gem, Trash2, Pencil, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { formatToman } from "@/lib/format";
import { ASSET_TYPES } from "@/lib/constants";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { toast } from "sonner";
import { AmountInput } from "@/components/amount-input";
import { PageHero } from "@/components/layout/page-hero";

interface Asset {
  id: string;
  name: string;
  type: keyof typeof ASSET_TYPES;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  purchasePrice: number | null;
  profit: number | null;
  color: string;
  notes: string | null;
  purchaseDate?: string | null;
}

const emptyForm = {
  name: "",
  type: "gold" as Asset["type"],
  quantity: "1",
  unitPrice: "",
  purchasePrice: "",
  purchaseDate: "",
  notes: "",
};

export default function AssetsPage() {
  const confirm = useConfirm();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [syncing, startSync] = useTransition();

  const load = () =>
    fetch("/api/assets")
      .then((r) => r.json())
      .then((d) => {
        setAssets(d.assets);
        setTotalValue(d.totalValue);
      });

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (a: Asset) => {
    setEditing(a);
    setForm({
      name: a.name,
      type: a.type,
      quantity: String(a.quantity),
      unitPrice: String(a.unitPrice),
      purchasePrice: a.purchasePrice != null ? String(a.purchasePrice) : "",
      purchaseDate: a.purchaseDate ? String(a.purchaseDate).slice(0, 10) : "",
      notes: a.notes ?? "",
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      type: form.type,
      quantity: parseFloat(form.quantity),
      unitPrice: parseInt(form.unitPrice.replace(/,/g, "")),
      purchasePrice: form.purchasePrice
        ? parseInt(form.purchasePrice.replace(/,/g, ""))
        : null,
      purchaseDate: form.purchaseDate || null,
      notes: form.notes || null,
    };

    if (editing) {
      const res = await fetch(`/api/assets/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          quantity: payload.quantity,
          unitPrice: payload.unitPrice,
          notes: payload.notes,
        }),
      });
      if (!res.ok) return toast.error("خطا در ویرایش");
      toast.success("دارایی به‌روز شد");
    } else {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return toast.error("خطا در ثبت");
      toast.success("دارایی اضافه شد");
    }

    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (a: Asset) => {
    const ok = await confirm({
      title: "حذف دارایی",
      description: `دارایی «${a.name}» حذف شود؟`,
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/assets/${a.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("خطا در حذف");
    toast.success("حذف شد");
    load();
  };

  const syncRates = () => {
    startSync(async () => {
      try {
        const res = await fetch("/api/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync-assets" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error("fail");
        toast.success(
          data.updated
            ? `${data.updated} دارایی با نرخ مرجع به‌روز شد`
            : "تغییری لازم نبود"
        );
        load();
      } catch {
        toast.error("همگام‌سازی نرخ ناموفق بود");
      }
    });
  };

  return (
    <>
      <Header title="دارایی‌ها" />
      <div className="p-4 lg:p-8 space-y-6 motion-stagger">
        <PageHero
          heroKey="assets"
          title="دارایی‌ها"
          subtitle="طلا، ارز و سرمایه‌هایت در یک نگاه"
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <StatCard label="ارزش کل دارایی‌ها" value={formatToman(totalValue)} icon={<Gem />} className="w-full sm:w-80" />
          <div className="flex gap-2">
            <Button variant="outline" disabled={syncing} onClick={syncRates}>
              <RefreshCw className="h-4 w-4 ml-2" />
              همگام نرخ طلا/ارز
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 ml-2" />
              دارایی جدید
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <Card key={a.id}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${a.color}20`, color: a.color }}
                    >
                      <Gem className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ASSET_TYPES[a.type].label} · {a.quantity} واحد
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(a)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xl font-semibold tabular-nums mt-4">{formatToman(a.totalValue)}</p>
                {a.profit != null && (
                  <p
                    className={`text-sm mt-1 flex items-center gap-1 ${
                      a.profit >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {a.profit >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {a.profit >= 0 ? "+" : ""}
                    {formatToman(a.profit)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {assets.length === 0 && (
          <EmptyState
            title="هنوز دارایی ثبت نشده"
            description="طلا، ارز، سهام یا ملک را اینجا پیگیری کنید."
            actionLabel="افزودن دارایی"
            onAction={openCreate}
            icon={<Gem className="h-5 w-5" />}
          />
        )}

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
                {editing ? "ویرایش دارایی" : "افزودن دارایی"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>نام</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثلاً سکه طلا"
                  required
                />
              </div>
              {!editing && (
                <div>
                  <Label>نوع</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      setForm({ ...form, type: (v ?? "gold") as Asset["type"] })
                    }
                    items={Object.fromEntries(
                      Object.entries(ASSET_TYPES).map(([k, v]) => [k, v.label])
                    )}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASSET_TYPES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>تعداد</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>قیمت واحد (تومان)</Label>
                  <AmountInput
                    value={form.unitPrice}
                    onValueChange={(v) => setForm({ ...form, unitPrice: v })}
                    required
                  />
                </div>
              </div>
              {!editing && (
                <>
                  <div>
                    <Label>قیمت خرید کل (اختیاری)</Label>
                    <AmountInput
                      value={form.purchasePrice}
                      onValueChange={(v) =>
                        setForm({ ...form, purchasePrice: v })
                      }
                    />
                  </div>
                  <div>
                    <Label>تاریخ خرید</Label>
                    <JalaliDatePicker
                      value={form.purchaseDate}
                      onChange={(d) => setForm({ ...form, purchaseDate: d })}
                    />
                  </div>
                </>
              )}
              <div>
                <Label>یادداشت</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                ذخیره
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
