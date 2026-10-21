"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatJalaliDateTime, formatToman, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ADMIN_SECTIONS,
  ADMIN_TABLE_BY_KEY,
  ADMIN_TABLE_META,
  type AdminSectionId,
} from "@/lib/admin-catalog";
import {
  Search,
  Users,
  ChevronLeft,
  Database,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  transactionCount: number;
};

type UserDetail = {
  user: AdminUser;
  tables: Record<string, Record<string, unknown>[]>;
  counts: Record<string, number>;
  sectionCounts: Record<string, number>;
  totalRecords: number;
};

const MONEY_KEYS = new Set([
  "amount",
  "totalAmount",
  "paidAmount",
  "targetAmount",
  "currentAmount",
  "unitPrice",
  "purchasePrice",
  "initialBalance",
  "cost",
  "budget",
  "monthlyBudget",
]);

function cellValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (value instanceof Date) return formatJalaliDateTime(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return formatJalaliDateTime(value);
    } catch {
      return value;
    }
  }
  if (typeof value === "number" && MONEY_KEYS.has(key)) {
    return formatToman(value);
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  const s = String(value);
  if (s.length > 120) return s.slice(0, 117) + "…";
  return s;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [section, setSection] = useState<AdminSectionId | "all">("all");
  const [tableFilter, setTableFilter] = useState("");
  const [rowQuery, setRowQuery] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const [rawOpen, setRawOpen] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const isAdmin = Boolean(d.user?.isAdmin);
        setAllowed(isAdmin);
        if (isAdmin) {
          return fetch("/api/admin/users")
            .then((r) => r.json())
            .then((list) => setUsers(list.users ?? []));
        }
      })
      .catch(() => setAllowed(false));
  }, []);

  const openUser = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    setSection("all");
    setTableFilter("");
    setRowQuery("");
    setRawOpen({});
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      setDetail(res.ok ? await res.json() : null);
      if (!res.ok) toast.error("بارگذاری داده کاربر ناموفق بود");
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, userQuery]);

  const visibleTables = useMemo(() => {
    if (!detail) return [];
    const q = tableFilter.trim().toLowerCase();
    return ADMIN_TABLE_META.filter((meta) => {
      if (section !== "all" && meta.section !== section) return false;
      const n = detail.counts[meta.key] ?? 0;
      if (!showEmpty && n === 0) return false;
      if (!q) return true;
      return (
        meta.key.toLowerCase().includes(q) ||
        meta.label.includes(tableFilter.trim())
      );
    });
  }, [detail, section, showEmpty, tableFilter]);

  const filterRows = (rows: Record<string, unknown>[]) => {
    const q = rowQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(q)
    );
  };

  const copyJson = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(detail, null, 2));
      setCopied(true);
      toast.success("کل داده‌ها کپی شد");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("کپی نشد");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <Header title="پنل مدیریت" />
      <div className="p-4 lg:p-8 space-y-6 motion-stagger max-w-[1400px] mx-auto w-full">
        <PageHero
          heroKey="settings"
          title="مرکز داده کاربران"
          subtitle="مشاهدهٔ کامل اطلاعات ثبت‌شده هر کاربر — فقط برای مدیر"
        />

        {allowed === null && (
          <p className="text-sm text-muted-foreground">در حال بررسی دسترسی…</p>
        )}

        {allowed === false && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              این صفحه فقط برای مدیر برنامه قابل دسترس است.
            </CardContent>
          </Card>
        )}

        {allowed && (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Users rail */}
            <Card className="h-fit lg:sticky lg:top-4 border-primary/10 overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  کاربران
                  <Badge variant="secondary" className="ms-auto">
                    {users.length}
                  </Badge>
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="جستجوی نام یا ایمیل…"
                    className="ps-8 h-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-2 max-h-[70vh] overflow-y-auto space-y-1">
                {filteredUsers.map((u) => {
                  const active = selectedId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => openUser(u.id)}
                      className={cn(
                        "w-full text-start rounded-xl p-3 transition-all border",
                        active
                          ? "border-primary/40 bg-primary/8 shadow-sm"
                          : "border-transparent hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {initials(u.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{u.name}</p>
                          <p
                            className="text-[11px] text-muted-foreground truncate"
                            dir="ltr"
                          >
                            {u.email}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {u.transactionCount.toLocaleString("fa-IR")} تراکنش ·{" "}
                            {toISODate(new Date(u.createdAt))}
                          </p>
                        </div>
                        <ChevronLeft
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                            active && "-rotate-90 text-primary"
                          )}
                        />
                      </div>
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    کاربری پیدا نشد.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Detail pane */}
            <div className="space-y-4 min-w-0">
              {!selectedId && !loadingDetail && (
                <Card className="border-dashed">
                  <CardContent className="py-16 text-center space-y-3">
                    <Database className="h-10 w-10 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      یک کاربر را از فهرست انتخاب کن تا همهٔ داده‌هایش را ببینی.
                    </p>
                  </CardContent>
                </Card>
              )}

              {loadingDetail && (
                <Card>
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    در حال بارگذاری داده‌ها…
                  </CardContent>
                </Card>
              )}

              {detail && !loadingDetail && (
                <>
                  <Card className="overflow-hidden border-primary/15">
                    <div className="bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold shadow-sm">
                            {initials(detail.user.name)}
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-xl font-bold truncate">
                              {detail.user.name}
                            </h2>
                            <p
                              className="text-sm text-muted-foreground truncate"
                              dir="ltr"
                            >
                              {detail.user.email}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              عضویت:{" "}
                              {formatJalaliDateTime(detail.user.createdAt)} ·{" "}
                              {detail.totalRecords.toLocaleString("fa-IR")} رکورد
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyJson}
                          className="gap-1.5"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          کپی JSON کامل
                        </Button>
                      </div>

                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {ADMIN_SECTIONS.map((s) => {
                          const n = detail.sectionCounts[s.id] ?? 0;
                          const active = section === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() =>
                                setSection(active ? "all" : s.id)
                              }
                              className={cn(
                                "rounded-xl border px-3 py-2.5 text-start transition-all",
                                active
                                  ? "border-primary bg-background shadow-sm"
                                  : "border-border/60 bg-background/60 hover:bg-background"
                              )}
                            >
                              <p className="text-[11px] text-muted-foreground">
                                {s.label}
                              </p>
                              <p className="text-lg font-bold tabular-nums">
                                {n.toLocaleString("fa-IR")}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </Card>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant={section === "all" ? "default" : "outline"}
                      onClick={() => setSection("all")}
                    >
                      همه بخش‌ها
                    </Button>
                    {ADMIN_SECTIONS.map((s) => (
                      <Button
                        key={s.id}
                        size="sm"
                        variant={section === s.id ? "default" : "outline"}
                        onClick={() => setSection(s.id)}
                      >
                        {s.label}
                        <Badge
                          variant="secondary"
                          className="ms-1.5 h-5 px-1.5 text-[10px]"
                        >
                          {(detail.sectionCounts[s.id] ?? 0).toLocaleString(
                            "fa-IR"
                          )}
                        </Badge>
                      </Button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[160px]">
                      <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={tableFilter}
                        onChange={(e) => setTableFilter(e.target.value)}
                        placeholder="فیلتر جدول…"
                        className="ps-8 h-9"
                      />
                    </div>
                    <div className="relative flex-1 min-w-[160px]">
                      <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={rowQuery}
                        onChange={(e) => setRowQuery(e.target.value)}
                        placeholder="جستجو داخل رکوردها…"
                        className="ps-8 h-9"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowEmpty((v) => !v)}
                      className="gap-1.5"
                    >
                      {showEmpty ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {showEmpty ? "مخفی کردن خالی‌ها" : "نمایش جداول خالی"}
                    </Button>
                  </div>

                  {visibleTables.length === 0 && (
                    <Card>
                      <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        در این فیلتر رکوردی نیست.
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-4">
                    {visibleTables.map((meta) => {
                      const allRows = detail.tables[meta.key] ?? [];
                      const rows = filterRows(allRows);
                      const isRaw = rawOpen[meta.key];
                      return (
                        <Card
                          key={meta.key}
                          className="overflow-hidden border-border/70"
                        >
                          <CardHeader className="border-b bg-muted/20 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <CardTitle className="text-base flex items-center gap-2">
                                  {meta.label}
                                  <Badge variant="secondary">
                                    {allRows.length.toLocaleString("fa-IR")}
                                  </Badge>
                                  {rowQuery && rows.length !== allRows.length && (
                                    <Badge variant="outline">
                                      {rows.length.toLocaleString("fa-IR")} نتیجه
                                    </Badge>
                                  )}
                                </CardTitle>
                                <p
                                  className="text-[11px] text-muted-foreground mt-0.5"
                                  dir="ltr"
                                >
                                  {meta.key}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setRawOpen((prev) => ({
                                    ...prev,
                                    [meta.key]: !prev[meta.key],
                                  }))
                                }
                              >
                                {isRaw ? "جدول" : "JSON خام"}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            {allRows.length === 0 ? (
                              <p className="p-4 text-sm text-muted-foreground">
                                خالی
                              </p>
                            ) : isRaw ? (
                              <pre
                                dir="ltr"
                                className="max-h-80 overflow-auto p-4 text-[11px] leading-5 bg-muted/40"
                              >
                                {JSON.stringify(rows, null, 2)}
                              </pre>
                            ) : (
                              <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-xs">
                                  <thead className="sticky top-0 bg-card z-10 border-b">
                                    <tr>
                                      <th className="px-3 py-2 text-start font-medium text-muted-foreground w-10">
                                        #
                                      </th>
                                      {meta.columns.map((col) => (
                                        <th
                                          key={col}
                                          className="px-3 py-2 text-start font-medium text-muted-foreground whitespace-nowrap"
                                          dir="ltr"
                                        >
                                          {col}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.slice(0, 200).map((row, i) => (
                                      <tr
                                        key={String(row.id ?? i)}
                                        className="border-b last:border-0 hover:bg-muted/40"
                                      >
                                        <td className="px-3 py-2 text-muted-foreground tabular-nums">
                                          {(i + 1).toLocaleString("fa-IR")}
                                        </td>
                                        {meta.columns.map((col) => (
                                          <td
                                            key={col}
                                            className="px-3 py-2 max-w-[220px]"
                                          >
                                            <span
                                              className="block truncate"
                                              title={cellValue(col, row[col])}
                                            >
                                              {cellValue(col, row[col])}
                                            </span>
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {rows.length > 200 && (
                                  <p className="p-3 text-[11px] text-muted-foreground border-t">
                                    فقط ۲۰۰ ردیف اول نمایش داده شد — برای همه از
                                    JSON خام یا کپی کامل استفاده کن.
                                  </p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* orphan tables not in catalog */}
                  {Object.keys(detail.tables)
                    .filter((k) => !ADMIN_TABLE_BY_KEY[k])
                    .map((key) => {
                      const rows = detail.tables[key] ?? [];
                      if (!showEmpty && rows.length === 0) return null;
                      return (
                        <Card key={key}>
                          <CardHeader>
                            <CardTitle className="text-sm" dir="ltr">
                              {key}{" "}
                              <Badge variant="secondary">{rows.length}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <pre
                              dir="ltr"
                              className="max-h-60 overflow-auto text-[11px] bg-muted/40 rounded-lg p-3"
                            >
                              {JSON.stringify(rows, null, 2)}
                            </pre>
                          </CardContent>
                        </Card>
                      );
                    })}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
