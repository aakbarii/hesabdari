"use client";

import { TotpQrCode } from "@/components/totp-qr-code";
import { AUTH_ENABLED } from "@/lib/app-config";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/components/currency-provider";
import { CURRENCY_UNITS, type CurrencyUnit } from "@/lib/currency";
import { formatAmount } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Check,
  Coins,
  User,
  Shield,
  Tags,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SAMPLE_AMOUNT = 1_250_000;

interface Profile {
  name: string;
  email: string;
}


interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
}

export default function SettingsPage() {
  const confirm = useConfirm();
  const { currency, setCurrency } = useCurrency();
  const [, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{
    secret: string;
    uri: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    color: CATEGORY_COLORS[0],
  });

  const load = () => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d);
        setName(d.name ?? "");
        setEmail(d.email ?? "");
      });
    if (AUTH_ENABLED) fetch("/api/auth/2fa")
      .then((r) => r.json())
      .then((d) => setTotpEnabled(Boolean(d.enabled)));
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  };

  useEffect(() => {
    load();
  }, []);

  const selectCurrency = async (unit: CurrencyUnit) => {
    if (unit === currency) return;
    try {
      await setCurrency(unit);
      toast.success(`واحد پول به ${CURRENCY_UNITS[unit].label} تغییر کرد`);
    } catch {
      toast.error("خطا در ذخیره تنظیمات");
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = { name, email };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("پروفایل ذخیره شد");
      setCurrentPassword("");
      setNewPassword("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };


  const openCreateCat = () => {
    setEditingCat(null);
    setCatForm({ name: "", type: "expense", color: CATEGORY_COLORS[0] });
    setCatOpen(true);
  };

  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatForm({ name: c.name, type: c.type, color: c.color });
    setCatOpen(true);
  };

  const submitCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCat) {
      const res = await fetch(`/api/categories/${editingCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catForm.name, color: catForm.color }),
      });
      if (!res.ok) return toast.error("خطا در ویرایش");
      toast.success("دسته به‌روز شد");
    } else {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      if (!res.ok) return toast.error("خطا در ثبت");
      toast.success("دسته اضافه شد");
    }
    setCatOpen(false);
    setEditingCat(null);
    load();
  };

  const removeCat = async (c: Category) => {
    const ok = await confirm({
      title: "حذف دسته‌بندی",
      description: `دسته «${c.name}» حذف شود؟`,
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("خطا در حذف");
    toast.success("دسته حذف شد");
    load();
  };

  const startTotpSetup = async () => {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setTotpSetup({ secret: data.secret, uri: data.uri });
      setTotpCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setTotpLoading(false);
    }
  };

  const enableTotp = async () => {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("احراز هویت دو مرحله‌ای فعال شد");
      setTotpEnabled(true);
      setTotpSetup(null);
      setTotpCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setTotpLoading(false);
    }
  };

  const disableTotp = async () => {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("۲FA غیرفعال شد");
      setTotpEnabled(false);
      setDisablePassword("");
      setDisableCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setTotpLoading(false);
    }
  };

  return (
    <>
      <Header title="تنظیمات" />
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6 motion-stagger">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              پروفایل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>نام</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>ایمیل</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {/* Password management is paused together with login. */}
              {AUTH_ENABLED && <div className="border-t pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">تغییر رمز (اختیاری)</p>
                <div className="space-y-2">
                  <Label>رمز فعلی</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رمز جدید</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                </div>
              </div>}
              <Button type="submit" disabled={saving}>
                {saving ? "..." : "ذخیره پروفایل"}
              </Button>
            </form>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5 text-primary" />
              واحد پول
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(CURRENCY_UNITS) as CurrencyUnit[]).map((unit) => {
              const cfg = CURRENCY_UNITS[unit];
              const selected = currency === unit;
              return (
                <button
                  key={unit}
                  type="button"
                  onClick={() => selectCurrency(unit)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl border p-4 text-right transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div>
                    <p className="font-semibold">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cfg.description}
                    </p>
                    <p className="text-sm mt-2 text-primary">
                      نمونه: {formatAmount(SAMPLE_AMOUNT, unit)}
                    </p>
                  </div>
                  {selected && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tags className="h-5 w-5 text-primary" />
              دسته‌بندی‌ها
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openCreateCat}>
              <Plus className="h-4 w-4 ml-1" />
              جدید
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">دسته‌ای تعریف نشده</p>
            ) : (
              categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="truncate text-sm">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {c.type === "income" ? "درآمد" : "هزینه"}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditCat(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeCat(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 2FA code is retained while authentication is disabled. */}
        {AUTH_ENABLED && <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              احراز هویت دو مرحله‌ای (۲FA)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              با فعال‌سازی ۲FA، پس از ورود رمز، کد اپ احراز هویت (مثل Google
              Authenticator) هم لازم است.
            </p>
            {totpEnabled ? (
              <div className="space-y-3">
                <p className="text-emerald-600 font-medium">✓ ۲FA فعال است</p>
                <div className="space-y-2 border-t pt-3">
                  <p className="text-muted-foreground">برای غیرفعال‌سازی:</p>
                  <div className="space-y-2">
                    <Label>رمز عبور</Label>
                    <Input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>کد ۲FA</Label>
                    <Input
                      inputMode="numeric"
                      value={disableCode}
                      onChange={(e) =>
                        setDisableCode(e.target.value.replace(/\D/g, ""))
                      }
                      maxLength={6}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={totpLoading}
                    onClick={disableTotp}
                  >
                    غیرفعال‌سازی ۲FA
                  </Button>
                </div>
              </div>
            ) : totpSetup ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <TotpQrCode value={totpSetup.uri} />
                </div>
                <p className="text-xs text-muted-foreground break-all text-center">
                  کلید دستی: <code className="font-mono">{totpSetup.secret}</code>
                </p>
                <div className="space-y-2">
                  <Label>کد ۶ رقمی از اپ</Label>
                  <Input
                    inputMode="numeric"
                    value={totpCode}
                    onChange={(e) =>
                      setTotpCode(e.target.value.replace(/\D/g, ""))
                    }
                    maxLength={6}
                    placeholder="۰۰۰۰۰۰"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={totpLoading || totpCode.length < 6}
                    onClick={enableTotp}
                  >
                    فعال‌سازی
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setTotpSetup(null)}
                  >
                    انصراف
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={totpLoading}
                onClick={startTotpSetup}
              >
                راه‌اندازی ۲FA
              </Button>
            )}
          </CardContent>
        </Card>}
      </div>

      <Dialog
        open={catOpen}
        onOpenChange={(v) => {
          setCatOpen(v);
          if (!v) setEditingCat(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCat ? "ویرایش دسته" : "دسته جدید"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCat} className="space-y-4">
            <div className="space-y-2">
              <Label>نام</Label>
              <Input
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                required
              />
            </div>
            {!editingCat && (
              <div className="space-y-2">
                <Label>نوع</Label>
                <Select
                  value={catForm.type}
                  onValueChange={(v) =>
                    setCatForm({
                      ...catForm,
                      type: (v ?? "expense") as "income" | "expense",
                    })
                  }
                  items={{ expense: "هزینه", income: "درآمد" }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">هزینه</SelectItem>
                    <SelectItem value="income">درآمد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>رنگ</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "h-7 w-7 rounded-full border-2",
                      catForm.color === c
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setCatForm({ ...catForm, color: c })}
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
