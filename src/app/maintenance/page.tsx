"use client";

import { toISODate } from "@/lib/format";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card,   } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Car, AlertTriangle, Plus, Trash2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface VehicleService {
  id: string;
  vehicleName: string;
  serviceType: "oil_change" | "filter" | "brake_pads" | "insurance" | "inspection" | "tires" | "other";
  currentMileage: number;
  nextDueMileage: number | null;
  serviceDate: string;
  nextDueDate: string | null;
  cost: number;
  notes: string | null;
}

const SERVICE_TYPES = {
  oil_change: { label: "تعویض روغن موتور", icon: "🛢️" },
  filter: { label: "تعویض فیلترها (روغن/هوا/اتاق)", icon: "💨" },
  brake_pads: { label: "لنت و ترمز", icon: "🛑" },
  insurance: { label: "بیمه شخص ثالث / بدنه", icon: "📋" },
  inspection: { label: "معاینه فنی", icon: "🔍" },
  tires: { label: "لاستیک و بالانس", icon: "🚗" },
  other: { label: "سایر تعمیرات", icon: "🔧" },
} as const;

/** Labels for Base UI Select trigger (without this it shows raw slugs like oil_change) */
const SERVICE_TYPE_ITEMS = Object.fromEntries(
  Object.entries(SERVICE_TYPES).map(([id, meta]) => [id, `${meta.icon} ${meta.label}`])
) as Record<keyof typeof SERVICE_TYPES, string>;

export default function MaintenancePage() {
  const [services, setServices] = useState<VehicleService[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [isPending, startTransition] = useTransition();

  const todayStr = toISODate(new Date());

  const [form, setForm] = useState({
    vehicleName: "خودروی من",
    serviceType: "oil_change" as VehicleService["serviceType"],
    currentMileage: "85000",
    nextDueMileage: "90000",
    serviceDate: todayStr,
    nextDueDate: "",
    cost: "1200000",
    notes: "",
  });

  const loadData = async () => {
    try {
      const res = await fetch("/api/maintenance");
      if (res.ok) {
        const json = await res.json();
        setServices(json.services || []);
      }
    } catch {}
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/maintenance", { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error("Load failed"); return res.json(); })
      .then((json) => { setServices(json.services); })
      .catch(() => { if (!controller.signal.aborted) toast.error("دریافت اطلاعات انجام نشد. دوباره تلاش کنید."); });
    return () => controller.abort();
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleName: form.vehicleName,
            serviceType: form.serviceType,
            currentMileage: Number(form.currentMileage) || 0,
            nextDueMileage: form.nextDueMileage ? Number(form.nextDueMileage) : null,
            serviceDate: form.serviceDate,
            nextDueDate: form.nextDueDate || null,
            cost: Number(form.cost) || 0,
            notes: form.notes || null,
          }),
        });

        if (res.ok) {
          toast.success("سرویس خودرو با موفقیت ثبت شد 🚗");
          setOpenAdd(false);
          loadData();
        } else {
          toast.error("خطا در ثبت اطلاعات");
        }
      } catch {
        toast.error("خطا در ارتباط با سرور");
      }
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/maintenance/${id}`, { method: "DELETE" });
      toast.success("مورد حذف شد");
      loadData();
    } catch {}
  };

  const totalCost = services.reduce((sum, s) => sum + s.cost, 0);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <Header title="نگهداری و سرویس‌های خودرو" />

      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <PageHero
          heroKey="maintenance"
          title="نگهداری و سرویس‌های خودرو"
          subtitle="ثبت کیلومتر، تعویض روغن، بیمه، لنت و هشدارهای سررسید"
          action={
            <Button size="sm" onClick={() => setOpenAdd(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> ثبت سرویس جدید
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Car className="h-4 w-4 text-primary" /> کل سرویس‌های ثبت‌شده
            </p>
            <p className="text-3xl font-extrabold mt-2">{services.length.toLocaleString("fa-IR")}</p>
          </Card>

          <Card className="border p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> مجموع هزینه‌های نگهداری
            </p>
            <p className="text-3xl font-extrabold mt-2 text-emerald-600">
              {totalCost.toLocaleString("fa-IR")} <span className="text-xs font-normal text-muted-foreground">تومان</span>
            </p>
          </Card>

          <Card className="border p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> وضعیت پایش
            </p>
            <p className="text-lg font-bold mt-2 text-primary flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> خودرو تحت کنترل
            </p>
          </Card>
        </div>

        {/* Services List */}
        <div className="space-y-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" /> تاریخچه سرویس‌ها
          </h3>

          {services.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted-foreground border">
              هنوز سرویسی ثبت نکرده‌اید. دکمه «ثبت سرویس جدید» را بزنید!
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((s) => (
                <Card key={s.id} className="border shadow-sm p-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{SERVICE_TYPES[s.serviceType]?.icon ?? "🔧"}</span>
                        <div>
                          <p className="font-bold text-sm">{SERVICE_TYPES[s.serviceType]?.label ?? s.serviceType}</p>
                          <p className="text-xs text-muted-foreground">{s.vehicleName}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">
                        {s.cost > 0 ? `${s.cost.toLocaleString("fa-IR")} ت` : "رایگان"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t font-mono">
                      <div>
                        <span>کیلومتر انجام: </span>
                        <span className="font-bold text-foreground">{s.currentMileage.toLocaleString("fa-IR")} km</span>
                      </div>
                      {s.nextDueMileage && (
                        <div>
                          <span>کیلومتر بعدی: </span>
                          <span className="font-bold text-amber-600">{s.nextDueMileage.toLocaleString("fa-IR")} km</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>تاریخ: {s.serviceDate}</span>
                      {s.nextDueDate && <span>موعد بعدی: {s.nextDueDate}</span>}
                    </div>

                    {s.notes && <p className="text-xs text-muted-foreground/80 pt-1">{s.notes}</p>}
                  </div>

                  <div className="flex justify-end pt-3 border-t mt-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive h-7 w-7 hover:bg-destructive/10"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" /> ثبت سرویس خودرو
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vName">نام / مدل خودرو</Label>
                <Input
                  id="vName"
                  value={form.vehicleName}
                  onChange={(e) => setForm({ ...form, vehicleName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sType">نوع سرویس</Label>
                <Select
                  items={SERVICE_TYPE_ITEMS}
                  value={form.serviceType}
                  onValueChange={(v) => { if (v && v in SERVICE_TYPES) setForm({ ...form, serviceType: v as VehicleService["serviceType"] }); }}
                >
                  <SelectTrigger id="sType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SERVICE_TYPES) as (keyof typeof SERVICE_TYPES)[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {SERVICE_TYPE_ITEMS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="curKm">کیلومتر فعلی</Label>
                <Input
                  id="curKm"
                  type="number"
                  value={form.currentMileage}
                  onChange={(e) => setForm({ ...form, currentMileage: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nextKm">کیلومتر سرویس بعدی</Label>
                <Input
                  id="nextKm"
                  type="number"
                  value={form.nextDueMileage}
                  onChange={(e) => setForm({ ...form, nextDueMileage: e.target.value })}
                  placeholder="مثلاً: 90000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sDate">تاریخ انجام</Label>
                <Input
                  id="sDate"
                  type="date"
                  value={form.serviceDate}
                  onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost">هزینه (تومان)</Label>
                <Input
                  id="cost"
                  type="number"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sNotes">یادداشت و جزئیات</Label>
              <Input
                id="sNotes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="مثلاً: روغن توتال 10W40 + فیلتر سرکان"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenAdd(false)}>انصراف</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "ثبت..." : "ذخیره سرویس"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
