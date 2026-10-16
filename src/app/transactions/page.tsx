"use client";

import { useEffect, useState, useCallback } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Trash2,
  Pencil,
  Search,
  Filter,
  RefreshCw,
  Paperclip,
  ImageIcon,
} from "lucide-react";
import { formatToman, formatJalaliDate } from "@/lib/format";
import { AmountInput } from "@/components/amount-input";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { RECURRING_FREQUENCIES } from "@/lib/constants";
import { toast } from "sonner";

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  date: string;
  accountId: string;
  categoryId: string | null;
  accountName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  receiptPath: string | null;
}


interface Recurring {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  frequency: keyof typeof RECURRING_FREQUENCIES;
  nextRunDate: string;
  isActive: boolean;
  accountName: string | null;
  categoryName: string | null;
}

interface Transfer {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  fromAccountName: string;
  toAccountName: string;
}

const emptyTxForm = {
  type: "expense" as "income" | "expense",
  accountId: "",
  categoryId: "",
  amount: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
};

export default function TransactionsPage() {
  const confirm = useConfirm();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [txOpen, setTxOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [txForm, setTxForm] = useState(emptyTxForm);
  const [recurringForm, setRecurringForm] = useState({
    type: "expense" as "income" | "expense",
    accountId: "",
    categoryId: "",
    amount: "",
    description: "",
    frequency: "monthly" as keyof typeof RECURRING_FREQUENCIES,
    nextRunDate: new Date().toISOString().split("T")[0],
  });
  const [transferForm, setTransferForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [filters, setFilters] = useState({
    q: "",
    accountId: "",
    categoryId: "",
    minAmount: "",
    maxAmount: "",
    fromDate: "",
    toDate: "",
  });
  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (filters.q) p.set("q", filters.q);
    if (filters.accountId) p.set("accountId", filters.accountId);
    if (filters.categoryId) p.set("categoryId", filters.categoryId);
    if (filters.minAmount) p.set("minAmount", filters.minAmount);
    if (filters.maxAmount) p.set("maxAmount", filters.maxAmount);
    if (filters.fromDate) p.set("fromDate", filters.fromDate);
    if (filters.toDate) p.set("toDate", filters.toDate);
    return p.toString();
  }, [filters]);

  const load = useCallback(async () => {
    const qs = buildQuery();
    const [accs, cats, txs, trs, rec] = await Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch(`/api/transactions${qs ? `?${qs}` : ""}`).then((r) => r.json()),
      fetch("/api/transfers").then((r) => r.json()),
      fetch("/api/recurring").then((r) => r.json()),
    ]);
    setAccounts(accs);
    setCategories(cats);
    setTransactions(txs);
    setTransfers(trs);
    setRecurring(rec);
  }, [buildQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const openNewTx = (type: "income" | "expense" = "expense") => {
    const last =
      typeof window !== "undefined"
        ? localStorage.getItem("hesabdari:lastAccountId") ?? ""
        : "";
    setTxForm({
      ...emptyTxForm,
      type,
      accountId: last || accounts[0]?.id || "",
    });
    setReceiptFile(null);
    setTxOpen(true);
  };

  useEffect(() => {
    if (typeof window === "undefined" || accounts.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const neu = params.get("new");
    if (neu === "expense" || neu === "income") {
      openNewTx(neu);
      window.history.replaceState({}, "", "/transactions");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const filteredCategories = categories.filter((c) => c.type === txForm.type);
  const editCategories = categories.filter(
    (c) => c.type === (editTx?.type ?? "expense")
  );
  const accountItems = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const categoryItems = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const editCategoryItems = Object.fromEntries(
    editCategories.map((c) => [c.id, c.name])
  );
  const recurringCategoryItems = Object.fromEntries(
    categories
      .filter((c) => c.type === recurringForm.type)
      .map((c) => [c.id, c.name])
  );
  const frequencyItems = Object.fromEntries(
    Object.entries(RECURRING_FREQUENCIES).map(([k, v]) => [k, v.label])
  );
  const filterAccountItems = { all: "همه", ...accountItems };
  const filterCategoryItems = { all: "همه", ...categoryItems };

  const submitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...txForm,
        amount: parseInt(txForm.amount.replace(/,/g, "")),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      if (txForm.accountId) {
        localStorage.setItem("hesabdari:lastAccountId", txForm.accountId);
      }
      if (receiptFile && data.id) {
        const fd = new FormData();
        fd.append("file", receiptFile);
        await fetch(`/api/transactions/${data.id}/receipt`, {
          method: "POST",
          body: fd,
        });
      }
      toast.success(
        data.categoryId ? "تراکنش ثبت شد (دسته‌بندی خودکار)" : "تراکنش ثبت شد"
      );
      setTxOpen(false);
      setTxForm({
        ...emptyTxForm,
        accountId: txForm.accountId || emptyTxForm.accountId,
      });
      setReceiptFile(null);
      load();
    } else toast.error("خطا در ثبت");
  };

  const submitRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...recurringForm,
        amount: parseInt(recurringForm.amount.replace(/,/g, "")),
      }),
    });
    if (res.ok) {
      toast.success("تراکنش تکراری ثبت شد");
      setRecurringOpen(false);
      load();
    }
  };

  const toggleRecurring = async (id: string, isActive: boolean) => {
    await fetch(`/api/recurring/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  };

  const deleteRecurring = async (id: string) => {
    const ok = await confirm({
      title: "حذف تراکنش تکراری",
      description: "این مورد تکراری حذف شود؟",
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    toast.success("حذف شد");
    load();
  };

  const uploadReceipt = async (txId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/transactions/${txId}/receipt`, { method: "POST", body: fd });
    toast.success("رسید آپلود شد");
    load();
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTx) return;
    const res = await fetch(`/api/transactions/${editTx.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: editTx.accountId,
        categoryId: editTx.categoryId,
        type: editTx.type,
        amount: editTx.amount,
        description: editTx.description,
        date: new Date(editTx.date).toISOString().split("T")[0],
      }),
    });
    if (res.ok) {
      toast.success("تراکنش ویرایش شد");
      setEditTx(null);
      load();
    }
  };

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...transferForm,
        amount: parseInt(transferForm.amount.replace(/,/g, "")),
      }),
    });
    if (res.ok) {
      toast.success("انتقال ثبت شد");
      setTransferOpen(false);
      load();
    } else {
      const err = await res.json();
      toast.error(err.error || "خطا");
    }
  };

  const deleteTransaction = async (id: string) => {
    const ok = await confirm({
      title: "حذف تراکنش",
      description: "این تراکنش حذف شود؟",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("خطا در حذف");
    toast.success("حذف شد");
    load();
  };

  const deleteTransfer = async (id: string) => {
    const ok = await confirm({
      title: "حذف انتقال",
      description: "این انتقال حذف شود؟",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/transfers/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("خطا در حذف");
    toast.success("انتقال حذف شد");
    load();
  };

  return (
    <>
      <Header title="تراکنش‌ها" />
      <div className="p-4 lg:p-8 space-y-6 motion-stagger">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => openNewTx("expense")}>
            <Plus className="h-4 w-4 ml-2" />
            تراکنش جدید
          </Button>
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="h-4 w-4 ml-2" />
            انتقال
          </Button>
          <Button variant="outline" onClick={() => setRecurringOpen(true)}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تکراری
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 ml-2" />
            فیلتر
          </Button>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="pt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label>جستجو</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pr-9"
                    placeholder="توضیحات یا دسته..."
                    value={filters.q}
                    onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>حساب</Label>
                <Select
                  value={filters.accountId || "all"}
                  onValueChange={(v) =>
                    setFilters({ ...filters, accountId: !v || v === "all" ? "" : v })
                  }
                  items={filterAccountItems}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>دسته</Label>
                <Select
                  value={filters.categoryId || "all"}
                  onValueChange={(v) =>
                    setFilters({ ...filters, categoryId: !v || v === "all" ? "" : v })
                  }
                  items={filterCategoryItems}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="همه" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>از مبلغ</Label>
                <AmountInput value={filters.minAmount} onValueChange={(v) => setFilters({ ...filters, minAmount: v })} />
              </div>
              <div>
                <Label>تا مبلغ</Label>
                <AmountInput value={filters.maxAmount} onValueChange={(v) => setFilters({ ...filters, maxAmount: v })} />
              </div>
              <div>
                <Label>از تاریخ</Label>
                <JalaliDatePicker value={filters.fromDate} onChange={(d) => setFilters({ ...filters, fromDate: d })} />
              </div>
              <div>
                <Label>تا تاریخ</Label>
                <JalaliDatePicker value={filters.toDate} onChange={(d) => setFilters({ ...filters, toDate: d })} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
                <Button onClick={load}>اعمال فیلتر</Button>
                <Button variant="outline" onClick={() => setFilters({ q: "", accountId: "", categoryId: "", minAmount: "", maxAmount: "", fromDate: "", toDate: "" })}>
                  پاک کردن
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">همه ({transactions.length + transfers.length})</TabsTrigger>
            <TabsTrigger value="income">درآمد</TabsTrigger>
            <TabsTrigger value="expense">هزینه</TabsTrigger>
            <TabsTrigger value="transfer">انتقال</TabsTrigger>
            <TabsTrigger value="recurring">تکراری</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-2 mt-4">
            {transactions.length + transfers.length === 0 ? (
              <EmptyState
                title="هنوز تراکنشی نیست"
                description="اولین هزینه یا درآمد را ثبت کنید."
                actionLabel="ثبت تراکنش"
                onAction={() => openNewTx("expense")}
              />
            ) : (
              [...transactions, ...transfers.map((t) => ({ ...t, isTransfer: true }))]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item) =>
                  "isTransfer" in item && item.isTransfer ? (
                    <TransferRow
                      key={`t-${item.id}`}
                      transfer={item as Transfer}
                      onDelete={deleteTransfer}
                    />
                  ) : (
                    <TransactionRow key={item.id} tx={item as Transaction} onDelete={deleteTransaction} onEdit={setEditTx} onUploadReceipt={uploadReceipt} />
                  )
                )
            )}
          </TabsContent>
          <TabsContent value="income" className="space-y-2 mt-4">
            {transactions.filter((t) => t.type === "income").map((tx) => (
              <TransactionRow key={tx.id} tx={tx} onDelete={deleteTransaction} onEdit={setEditTx} onUploadReceipt={uploadReceipt} />
            ))}
          </TabsContent>
          <TabsContent value="expense" className="space-y-2 mt-4">
            {transactions.filter((t) => t.type === "expense").map((tx) => (
              <TransactionRow key={tx.id} tx={tx} onDelete={deleteTransaction} onEdit={setEditTx} onUploadReceipt={uploadReceipt} />
            ))}
          </TabsContent>
          <TabsContent value="transfer" className="space-y-2 mt-4">
            {transfers.map((t) => (
              <TransferRow key={t.id} transfer={t} onDelete={deleteTransfer} />
            ))}
          </TabsContent>
          <TabsContent value="recurring" className="space-y-2 mt-4">
            {recurring.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{r.description || "تراکنش تکراری"}</p>
                    <p className="text-xs text-muted-foreground">
                      {RECURRING_FREQUENCIES[r.frequency].label} · {r.accountName} · بعدی: {formatJalaliDate(r.nextRunDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${r.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                      {formatToman(r.amount)}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => toggleRecurring(r.id, r.isActive)}>
                      {r.isActive ? "غیرفعال" : "فعال"}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="حذف تکراری" onClick={() => deleteRecurring(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {recurring.length === 0 && (
              <EmptyState title="تراکنش تکراری ندارید" description="حقوق، اجاره یا اشتراک ماهانه را اینجا تعریف کنید." actionLabel="افزودن تکراری" onAction={() => setRecurringOpen(true)} />
            )}
          </TabsContent>
        </Tabs>

        {/* New transaction dialog */}
        <Dialog open={txOpen} onOpenChange={setTxOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>ثبت تراکنش</DialogTitle></DialogHeader>
            <form onSubmit={submitTransaction} className="space-y-4">
              <Tabs value={txForm.type} onValueChange={(v) => setTxForm({ ...txForm, type: (v ?? "expense") as "income" | "expense", categoryId: "" })}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="expense">هزینه</TabsTrigger>
                  <TabsTrigger value="income">درآمد</TabsTrigger>
                </TabsList>
              </Tabs>
              <div>
                <Label>مبلغ (تومان)</Label>
                <AmountInput value={txForm.amount} onValueChange={(v) => setTxForm({ ...txForm, amount: v })} required autoFocus className="text-lg h-11" />
              </div>
              <div>
                <Label>توضیحات</Label>
                <Input value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} placeholder="برای دسته‌بندی خودکار" />
              </div>
              <div>
                <Label className="mb-2 block">دسته</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {filteredCategories.slice(0, 10).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setTxForm({
                          ...txForm,
                          categoryId: txForm.categoryId === c.id ? "" : c.id,
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        txForm.categoryId === c.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>حساب</Label>
                <Select value={txForm.accountId} onValueChange={(v) => setTxForm({ ...txForm, accountId: v ?? "" })} items={accountItems}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب حساب" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>تاریخ</Label>
                <JalaliDatePicker value={txForm.date} onChange={(d) => setTxForm({ ...txForm, date: d })} />
              </div>
              <div>
                <Label>پیوست رسید (اختیاری)</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button type="submit" className="w-full">ذخیره</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={!!editTx} onOpenChange={() => setEditTx(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>ویرایش تراکنش</DialogTitle></DialogHeader>
            {editTx && (
              <form onSubmit={submitEdit} className="space-y-4">
                <div>
                  <Label>حساب</Label>
                  <Select value={editTx.accountId} onValueChange={(v) => setEditTx({ ...editTx, accountId: v ?? "" })} items={accountItems}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>دسته</Label>
                  <Select value={editTx.categoryId ?? ""} onValueChange={(v) => setEditTx({ ...editTx, categoryId: v || null })} items={editCategoryItems}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="بدون دسته" /></SelectTrigger>
                    <SelectContent>{editCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>مبلغ</Label>
                  <AmountInput value={String(editTx.amount || "")} onValueChange={(v) => setEditTx({ ...editTx, amount: parseInt(v || "0", 10) || 0 })} />
                </div>
                <div>
                  <Label>تاریخ</Label>
                  <JalaliDatePicker
                    value={new Date(editTx.date).toISOString().split("T")[0]}
                    onChange={(d) => setEditTx({ ...editTx, date: d })}
                  />
                </div>
                <div>
                  <Label>توضیحات</Label>
                  <Textarea value={editTx.description ?? ""} onChange={(e) => setEditTx({ ...editTx, description: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">ذخیره تغییرات</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Recurring dialog */}
        <Dialog open={recurringOpen} onOpenChange={setRecurringOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>تراکنش تکراری</DialogTitle></DialogHeader>
            <form onSubmit={submitRecurring} className="space-y-4">
              <Tabs value={recurringForm.type} onValueChange={(v) => setRecurringForm({ ...recurringForm, type: (v ?? "expense") as "income" | "expense", categoryId: "" })}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="expense">هزینه</TabsTrigger>
                  <TabsTrigger value="income">درآمد</TabsTrigger>
                </TabsList>
              </Tabs>
              <div>
                <Label>حساب</Label>
                <Select value={recurringForm.accountId} onValueChange={(v) => setRecurringForm({ ...recurringForm, accountId: v ?? "" })} items={accountItems}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب حساب" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>دسته</Label>
                <Select value={recurringForm.categoryId} onValueChange={(v) => setRecurringForm({ ...recurringForm, categoryId: v ?? "" })} items={recurringCategoryItems}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب" /></SelectTrigger>
                  <SelectContent>{categories.filter((c) => c.type === recurringForm.type).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>مبلغ</Label>
                <AmountInput value={recurringForm.amount} onValueChange={(v) => setRecurringForm({ ...recurringForm, amount: v })} required />
              </div>
              <div>
                <Label>تکرار</Label>
                <Select value={recurringForm.frequency} onValueChange={(v) => setRecurringForm({ ...recurringForm, frequency: (v ?? "monthly") as keyof typeof RECURRING_FREQUENCIES })} items={frequencyItems}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RECURRING_FREQUENCIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>شروع از</Label>
                <JalaliDatePicker value={recurringForm.nextRunDate} onChange={(d) => setRecurringForm({ ...recurringForm, nextRunDate: d })} />
              </div>
              <div>
                <Label>توضیحات</Label>
                <Input value={recurringForm.description} onChange={(e) => setRecurringForm({ ...recurringForm, description: e.target.value })} placeholder="مثلاً اجاره" />
              </div>
              <Button type="submit" className="w-full">ذخیره</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Transfer dialog */}
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>انتقال بین حساب‌ها</DialogTitle></DialogHeader>
            <form onSubmit={submitTransfer} className="space-y-4">
              <div>
                <Label>از حساب</Label>
                <Select value={transferForm.fromAccountId} onValueChange={(v) => setTransferForm({ ...transferForm, fromAccountId: v ?? "" })} items={accountItems}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="مبدا" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>به حساب</Label>
                <Select value={transferForm.toAccountId} onValueChange={(v) => setTransferForm({ ...transferForm, toAccountId: v ?? "" })} items={accountItems}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="مقصد" /></SelectTrigger>
                  <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>مبلغ</Label>
                <AmountInput value={transferForm.amount} onValueChange={(v) => setTransferForm({ ...transferForm, amount: v })} required />
              </div>
              <div>
                <Label>تاریخ</Label>
                <JalaliDatePicker value={transferForm.date} onChange={(d) => setTransferForm({ ...transferForm, date: d })} />
              </div>
              <Button type="submit" className="w-full">انتقال</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

function TransactionRow({
  tx,
  onDelete,
  onEdit,
  onUploadReceipt,
}: {
  tx: Transaction;
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onUploadReceipt: (txId: string, file: File) => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${tx.type === "income" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
            {tx.type === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          </div>
          <div>
            <p className="font-medium">{tx.description || tx.categoryName || "بدون عنوان"}</p>
            <p className="text-xs text-muted-foreground">{tx.accountName} · {formatJalaliDate(tx.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className={`font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
            {tx.type === "income" ? "+" : "-"}{formatToman(tx.amount)}
          </p>
          {tx.categoryName && <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">{tx.categoryName}</Badge>}
          {tx.receiptPath && (
            <a href={`/api/receipts/${tx.receiptPath}`} target="_blank" rel="noopener noreferrer">
              <ImageIcon className="h-4 w-4 text-primary" />
            </a>
          )}
          <label className="cursor-pointer">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadReceipt(tx.id, f);
            }} />
          </label>
          <Button variant="ghost" size="icon" onClick={() => onEdit(tx)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(tx.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TransferRow({
  transfer,
  onDelete,
}: {
  transfer: Transfer;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <ArrowLeftRight className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">
              {transfer.fromAccountName} → {transfer.toAccountName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatJalaliDate(transfer.date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-blue-600">
            {formatToman(transfer.amount)}
          </p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(transfer.id)}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
