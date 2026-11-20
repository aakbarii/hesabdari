"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/locale-provider";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const TYPE_LABELS = {
  fa: { transaction: "تراکنش", account: "حساب", goal: "هدف", debt: "بدهی/طلب", category: "دسته" },
  en: { transaction: "Transaction", account: "Account", goal: "Goal", debt: "Debt", category: "Category" },
} as const;

export function GlobalSearch() {
  const router = useRouter();
  const { locale } = useLocale();
  const en = locale === "en";
  const tx = (fa: string, english: string) => (en ? english : fa);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Search failed");
        const next = await res.json();
        if (!controller.signal.aborted) setResults(next);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query, open]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors min-w-[220px]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-start">{tx("جستجو...", "Search...")}</span>
        <kbd className="text-[10px] rounded border px-1.5 py-0.5 bg-background">
          Ctrl+K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border"
        aria-label={tx("جستجو", "Search")}
      >
        <Search className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="sr-only">{tx("جستجو", "Search")}</DialogTitle>
            <Input
              autoFocus
              placeholder={tx("تراکنش، حساب، هدف، بدهی...", "Transaction, account, goal, debt...")}
              value={query}
              aria-label={tx("جستجو در حسابداری", "Search Hesabdari")}
              onChange={(e) => {
                setQuery(e.target.value);
                setResults([]);
                setError(false);
                setLoading(e.target.value.trim().length >= 2);
              }}
              className="border-0 shadow-none focus-visible:ring-0 text-base"
            />
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto p-2" aria-live="polite" aria-busy={loading}>
            {query.trim().length < 2 && <p className="p-6 text-center text-sm text-muted-foreground">{tx("برای شروع، دست‌کم دو حرف بنویسید", "Type at least two letters")}</p>}
            {error && <p role="alert" className="p-3 text-sm text-destructive">{tx("جستجو انجام نشد. اتصال را بررسی و دوباره تلاش کنید.", "Search failed. Check the connection and try again.")}</p>}
            {loading && (
              <p className="text-sm text-muted-foreground p-3">{tx("در حال جستجو...", "Searching...")}</p>
            )}
            {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
              <p className="text-sm text-muted-foreground p-3">{tx("نتیجه‌ای یافت نشد", "No results")}</p>
            )}
            {results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                type="button"
                onClick={() => go(r.href)}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-right hover:bg-muted transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{r.title}</p>
                  {r.subtitle && (
                    <p className="text-xs text-muted-foreground">{r.subtitle}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 mr-2">
                  {TYPE_LABELS[en ? "en" : "fa"][r.type as keyof typeof TYPE_LABELS.fa] ?? r.type}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
