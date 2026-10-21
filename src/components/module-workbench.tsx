"use client";
import { useEffect, useMemo, useState } from "react";
import { Archive, Download, Pencil, Search, RefreshCw, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NOTE_TEMPLATES } from "@/lib/module-playbooks";
import { RESOURCES, csvCell, type Field } from "@/lib/workbench";
import { toast } from "sonner";

type Row = Record<string, string | number | null> & { id: string };
export default function ModuleWorkbench({ module }: { module: string }) {
  const resources = useMemo(() => Object.entries(RESOURCES).filter(([, r]) => r.module === module || (module === "reports" && ["transactions", "budget", "debts", "goals", "assets"].includes(r.module))), [module]);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(resources[0]?.[0] ?? "");
  const [records, setRecords] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const config = RESOURCES[key];
  useEffect(() => {
    if (!open || !key) return;
    const controller = new AbortController();
    fetch(`/api/workbench?resource=${encodeURIComponent(key)}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("دریافت سوابق انجام نشد");
      return response.json();
    }).then(data => { setRecords(data.records); setTruncated(data.truncated); }).catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, key, reload]);
  const statuses = [...new Set(records.map(r => r.status).filter(Boolean))];
  const hasDate = records.some(row => row.date || row.serviceDate || row.startDate || row.createdAt);
  const visible = records.filter(row => {
    const text = config.fields.map(f => String(row[f.key] ?? "")).join(" ").toLocaleLowerCase("fa");
    const normalized = (s: string) => s.replaceAll("ي", "ی").replaceAll("ك", "ک");
    const day = String(row.date ?? row.serviceDate ?? row.startDate ?? row.createdAt ?? "").slice(0, 10);
    return (!query || normalized(text).includes(normalized(query.trim().toLocaleLowerCase("fa")))) && (!status || row.status === status) && (!from || day >= from) && (!to || day <= to);
  });
  const edit = (row: Row) => { setEditing(row); setForm(Object.fromEntries(config.fields.map(field => [field.key, row[field.key] === null || row[field.key] === undefined ? "" : String(row[field.key]).slice(0, field.kind === "date" ? 10 : undefined)]))); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editing) return;
    setSaving(true);
    const values = Object.fromEntries(config.fields.map(field => [field.key, !form[field.key] && field.nullable ? null : field.kind === "number" ? Number(form[field.key]) : form[field.key]]));
    try {
      const response = await fetch("/api/workbench", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: key, id: editing.id, version: editing._version, values }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ذخیره انجام نشد");
      setEditing(null); setLoading(true); setError(""); setReload(value => value + 1); toast.success("اطلاعات اصلاح شد");
      window.dispatchEvent(new Event("ravaal:records-updated"));
      window.dispatchEvent(new Event("hesabdari:tx-created"));
    } catch (err) { toast.error(err instanceof Error ? err.message : "ذخیره انجام نشد"); }
    finally { setSaving(false); }
  };
  const exportCsv = () => {
    const fields: Field[] = [...config.fields];
    for (const [key, label] of [["amount", "مبلغ (تومان)"], ["totalAmount", "مبلغ کل (تومان)"], ["paidAmount", "پرداخت‌شده (تومان)"], ["currentAmount", "پس‌انداز (تومان)"], ["targetAmount", "هدف (تومان)"]]) if (visible.some(row => row[key] !== undefined) && !fields.some(f => f.key === key)) fields.push({ key, label });
    const content = [fields.map(f => csvCell(f.label)).join(","), ...visible.map(row => fields.map(f => csvCell(row[f.key])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `ravaal-${key}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (!resources.length) return null;
  return <>
    <Button variant="outline" size="sm" className="min-h-10 gap-2" onClick={() => { setLoading(true); setError(""); setEditing(null); setOpen(true); }} title="جستجو، ویرایش و خروجی سوابق"><Archive className="h-4 w-4" /><span className="hidden sm:inline">مدیریت سوابق</span><span className="sr-only sm:hidden">مدیریت سوابق</span></Button>
    <Dialog open={open} onOpenChange={next => { if (!saving) { setOpen(next);  } }}><DialogContent className="w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90dvh] overflow-y-auto" dir="rtl"><DialogHeader><DialogTitle>{editing ? "اصلاح اطلاعات" : "مدیریت حرفه‌ای سوابق"}</DialogTitle></DialogHeader>
      {editing ? <form onSubmit={save} className="space-y-5"><p className="text-xs leading-6 text-muted-foreground">{config.label} · تغییرها پس از ذخیره اعمال می‌شوند.</p>{NOTE_TEMPLATES[key] && config.fields.some(f => f.key === "notes") && <Button type="button" variant="outline" disabled={saving} onClick={() => setForm({ ...form, notes: [form.notes, NOTE_TEMPLATES[key]].filter(Boolean).join("\n\n") })}>افزودن قالب یادداشت ساختاریافته</Button>}<fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">{config.fields.map(field => <label key={field.key} className={field.kind === "note" ? "space-y-2 sm:col-span-2" : "space-y-2"}><span className="block text-sm">{field.label}</span>{field.kind === "select" ? <select value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} className="h-11 w-full rounded-lg border bg-background px-3 text-sm">{Object.entries(field.options!).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : field.kind === "note" ? <Textarea value={form[field.key]} maxLength={20000} onChange={e => setForm({ ...form, [field.key]: e.target.value })} rows={3} /> : <Input type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"} value={form[field.key]} required={!field.nullable} min={field.min} max={field.max} step={field.integer === false ? "any" : field.kind === "number" ? 1 : undefined} maxLength={200} onChange={e => setForm({ ...form, [field.key]: e.target.value })} />}</label>)}</fieldset><div className="flex gap-2"><Button disabled={saving} type="submit">{saving ? "در حال ذخیره…" : "ذخیره تغییرها"}</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>انصراف</Button></div></form> : <div className="space-y-4">
        <p className="text-sm leading-7 text-muted-foreground">سوابق را پیدا و اصلاح کن یا از نتیجهٔ فیلترشده خروجی Excel/CSV بگیر. مقدارهای مالی با واحد تومان صادر می‌شوند.</p>
        <div className="flex flex-wrap gap-2">{resources.map(([id, resource]) => <Button key={id} variant={id === key ? "default" : "outline"} onClick={() => { if (id === key) return; setLoading(true); setError(""); setEditing(null); setKey(id); setQuery(""); setStatus(""); setFrom(""); setTo(""); }}>{resource.label}</Button>)}</div>
        <div className="flex flex-wrap gap-2"><div className="relative min-w-48 flex-1"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="جستجو در سوابق" placeholder="جستجو در عنوان، یادداشت و جزئیات…" value={query} onChange={e => setQuery(e.target.value)} className="pr-10" /></div>{statuses.length > 0 && <select aria-label="فیلتر وضعیت" value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border bg-background px-3 text-sm"><option value="">همه وضعیت‌ها</option>{statuses.map(value => <option key={String(value)} value={String(value)}>{config.fields.find(f => f.key === "status")?.options?.[String(value)] ?? String(value)}</option>)}</select>}<Button variant="outline" disabled={loading || !!error || !visible.length} onClick={exportCsv}><Download className="h-4 w-4" /> خروجی CSV</Button></div>
        {hasDate && <div className="flex flex-wrap items-end gap-3 text-xs"><label>از تاریخ<Input aria-label="از تاریخ" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>تا تاریخ<Input aria-label="تا تاریخ" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label><Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); setQuery(""); setStatus(""); }}>پاک‌کردن فیلترها</Button></div>}
        {truncated && <p role="status" className="rounded-lg bg-amber-500/10 p-3 text-xs leading-6">آخرین ۵۰۰ رکورد نمایش داده شده؛ خروجی نیز محدود به همین سوابق است.</p>}
        {loading ? <p role="status" className="py-8 text-center text-sm">در حال دریافت…</p> : error ? <div role="alert" className="space-y-3 p-6 text-center"><p>{error}</p><Button variant="outline" onClick={() => { setLoading(true); setError(""); setReload(value => value + 1); }}><RefreshCw className="h-4 w-4" /> تلاش دوباره</Button></div> : <><div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4" />{visible.length.toLocaleString("fa-IR")} نتیجه از {records.length.toLocaleString("fa-IR")} رکورد</div><div className="max-h-[45dvh] space-y-2 overflow-y-auto">{visible.length ? visible.map(row => <div key={row.id} className="flex items-start gap-3 rounded-xl border p-4"><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{String(row[config.title] ?? config.label)}</h3><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">{config.fields.filter(f => f.key !== config.title && row[f.key] !== null && row[f.key] !== "").slice(0, 6).map(field => <span key={field.key} className="max-w-64 truncate">{field.label}: {field.options?.[String(row[field.key])] ?? String(row[field.key] ?? "—")}</span>)}</div></div><Button size="sm" variant="outline" onClick={() => edit(row)}><Pencil className="h-3.5 w-3.5" /> ویرایش</Button></div>) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{records.length ? "نتیجه‌ای با این فیلترها نیست." : "هنوز سابقه‌ای ثبت نشده. اولین مورد را از فرم اصلی این بخش اضافه کن."}</p>}</div></>}
      </div>}
    </DialogContent></Dialog>
  </>;
}
