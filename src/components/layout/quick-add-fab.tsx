"use client";

import { toISODate } from "@/lib/format";
import { parseTomanInput, getCurrencyLabel, getClientCurrency } from "@/lib/currency";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/amount-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LAST_ACCOUNT_KEY = "hesabdari:lastAccountId";

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export function QuickAddFab() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([accs, cats]) => {
      if (!Array.isArray(accs) || !Array.isArray(cats)) throw new Error("Load failed");
      setAccounts(accs);
      setCategories(cats);
      const last =
        typeof window !== "undefined"
          ? localStorage.getItem(LAST_ACCOUNT_KEY)
          : null;
      const preferred =
        (last && accs.find((a: Account) => a.id === last)?.id) ||
        accs[0]?.id ||
        "";
      setAccountId(preferred);
    }).catch(() => toast.error("حساب‌ها بارگذاری نشدند. دوباره تلاش کنید."));
  }, [open]);

  const filtered = categories.filter((c) => c.type === type);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          accountId,
          categoryId: categoryId || null,
          amount: parseTomanInput(amount),
          description,
          date: toISODate(new Date()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
      toast.success(type === "expense" ? "هزینه ثبت شد" : "درآمد ثبت شد");
      setOpen(false);
      setAmount("");
      setDescription("");
      setCategoryId("");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("hesabdari:tx-created"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ثبت");
    } finally {
      setSaving(false);
    }
  };

  if (pathname.startsWith("/login")) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "lg:hidden fixed z-50 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-4 shadow-lg shadow-primary/25 rounded-full",
          "flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-lg",
          "motion-press active:scale-95"
        )}
        aria-label="ثبت سریع"
      >
        <Plus className="h-7 w-7" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>ثبت سریع</SheetTitle>
          </SheetHeader>
          <form onSubmit={submit} className="mt-4 space-y-4 pb-6">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={type === "expense" ? "default" : "outline"}
                className={type === "expense" ? "bg-red-600 text-white hover:bg-red-600/90" : ""}
                onClick={() => {
                  setType("expense");
                  setCategoryId("");
                }}
              >
                <ArrowDownRight className="h-4 w-4 ml-1" />
                هزینه
              </Button>
              <Button
                type="button"
                variant={type === "income" ? "default" : "outline"}
                className={type === "income" ? "bg-emerald-600 text-white hover:bg-emerald-600/90" : ""}
                onClick={() => {
                  setType("income");
                  setCategoryId("");
                }}
              >
                <ArrowUpRight className="h-4 w-4 ml-1" />
                درآمد
              </Button>
            </div>

            <div>
              <Label>مبلغ ({getCurrencyLabel(getClientCurrency())})</Label>
              <AmountInput
                placeholder="مثلاً 50,000"
                value={amount}
                onValueChange={setAmount}
                className="text-lg h-12"
                required
                autoFocus
              />
            </div>

            <div>
              <Label>توضیح</Label>
              <Input
                placeholder="سوپرمارکت، بنزین، حقوق…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {filtered.length > 0 && (
              <div>
                <Label className="mb-2 block">دسته (اختیاری)</Label>
                <div className="flex flex-wrap gap-2">
                  {filtered.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setCategoryId(categoryId === c.id ? "" : c.id)
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors",
                        categoryId === c.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {accounts.length > 1 && (
              <div>
                <Label className="mb-2 block">حساب</Label>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAccountId(a.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors",
                        accountId === a.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={saving || !accountId}>
              {saving ? "…" : "ثبت"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

export { LAST_ACCOUNT_KEY };
