"use client";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatToman } from "@/lib/format";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  rawText: string;
  sender: string | null;
  suggestedType: "income" | "expense" | null;
  suggestedAmount: number | null;
  suggestedTitle: string | null;
  suggestedDate: string | null;
  suggestedAccountId: string | null;
  confidence: number;
  parseSource: string;
};

type Account = { id: string; name: string };

export default function BankInboxPage() {
  const { locale } = useLocale();
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [gemini, setGemini] = useState(false);
  const [paste, setPaste] = useState("");
  const [pending, start] = useTransition();
  const [edits, setEdits] = useState<
    Record<string, { title: string; amount: string; accountId: string; type: string }>
  >({});

  const load = () => {
    Promise.all([
      fetch("/api/bank-sms").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ])
      .then(([sms, acc]) => {
        setItems(sms.items ?? []);
        setToken(sms.smsIngestToken ?? null);
        setGemini(Boolean(sms.geminiEnabled));
        const list = Array.isArray(acc) ? acc : acc.accounts ?? [];
        setAccounts(list);
        const map: typeof edits = {};
        for (const it of sms.items ?? []) {
          map[it.id] = {
            title: it.suggestedTitle ?? "",
            amount: String(it.suggestedAmount ?? ""),
            accountId: it.suggestedAccountId ?? list[0]?.id ?? "",
            type: it.suggestedType ?? "expense",
          };
        }
        setEdits(map);
      })
      .catch(() => toast.error(locale === "en" ? "Load failed" : "خطا در بارگذاری"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ingest = () => {
    if (!paste.trim()) return;
    start(async () => {
      try {
        const res = await fetch("/api/bank-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: paste }),
        });
        if (!res.ok) throw new Error("fail");
        toast.success(locale === "en" ? "Added for review" : "برای تأیید اضافه شد");
        setPaste("");
        load();
      } catch {
        toast.error(locale === "en" ? "Parse failed" : "پارس نشد");
      }
    });
  };

  const rotateToken = () => {
    start(async () => {
      const res = await fetch("/api/bank-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate-token" }),
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        toast.success(locale === "en" ? "Token created" : "توکن ساخته شد");
      }
    });
  };

  const confirm = (id: string) => {
    const e = edits[id];
    if (!e?.accountId) {
      toast.error(locale === "en" ? "Pick an account" : "حساب را انتخاب کن");
      return;
    }
    start(async () => {
      try {
        const res = await fetch("/api/bank-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "confirm",
            id,
            accountId: e.accountId,
            title: e.title,
            amount: Number(e.amount) || 0,
            type: e.type,
          }),
        });
        if (!res.ok) throw new Error("fail");
        toast.success(locale === "en" ? "Saved to transactions" : "ثبت شد");
        load();
      } catch {
        toast.error(locale === "en" ? "Confirm failed" : "تأیید نشد");
      }
    });
  };

  const reject = (id: string) => {
    start(async () => {
      await fetch("/api/bank-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", id }),
      });
      load();
    });
  };

  const accountItems = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  return (
    <>
      <Header
        title={locale === "en" ? "Bank SMS inbox" : "صندوق پیامک بانکی"}
      />
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 motion-stagger">
        <PageHero
          heroKey="bankInbox"
          title={locale === "en" ? "Bank SMS inbox" : "صندوق پیامک بانکی"}
          subtitle={
            locale === "en"
              ? "SMS suggestions stay pending until you confirm."
              : "پیشنهاد پیامک‌ها تا وقتی تأیید نکنی وارد تراکنش‌ها نمی‌شود."
          }
        />
        <Card className="border-primary/15 overflow-hidden">
          <CardContent className="space-y-3 pt-5">
            <Badge variant="secondary">
              <Sparkles className="h-3 w-3 me-1" />
              {gemini
                ? locale === "en"
                  ? "Gemini ON"
                  : "Gemini فعال"
                : locale === "en"
                  ? "Heuristic only"
                  : "فقط پارس ساده"}
            </Badge>
            <Label>
              {locale === "en" ? "Paste a bank SMS" : "متن پیامک بانکی را بچسبان"}
            </Label>
            <Textarea
              rows={4}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder="مبلغ: ..."
            />
            <Button disabled={pending} onClick={ingest}>
              {locale === "en" ? "Parse & queue" : "پارس و صف تأیید"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "en" ? "Android / auto ingest token" : "توکن دریافت خودکار (اندروید)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {locale === "en"
                ? "Web/PWA cannot read SMS. The Android APK (or any SMS forwarder) posts to /api/bank-sms with this token."
                : "وب/PWA نمی‌تواند SMS بخواند. APK اندروید (یا فوروارد پیامک) با این توکن به /api/bank-sms می‌فرستد."}
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <code className="rounded-lg border px-2 py-1 text-xs" dir="ltr">
                {token || "—"}
              </code>
              <Button
                size="sm"
                variant="outline"
                disabled={!token}
                onClick={async () => {
                  if (!token) return;
                  await navigator.clipboard.writeText(token);
                  toast.success("OK");
                }}
              >
                <Copy className="h-3.5 w-3.5 me-1" />
                Copy
              </Button>
              <Button size="sm" disabled={pending} onClick={rotateToken}>
                {locale === "en" ? "Generate token" : "ساخت توکن"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {!items.length && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {locale === "en" ? "No pending SMS." : "پیامک معلقی نیست."}
            </p>
          )}
          {items.map((it) => {
            const e = edits[it.id];
            return (
              <Card key={it.id}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className={cn(
                        it.suggestedType === "income"
                          ? "text-emerald-600"
                          : "text-red-600"
                      )}
                    >
                      {it.suggestedType === "income"
                        ? locale === "en"
                          ? "Income"
                          : "واریز"
                        : locale === "en"
                          ? "Expense"
                          : "هزینه"}
                    </Badge>
                    <Badge variant="secondary">{it.parseSource}</Badge>
                    <Badge variant="secondary">{it.confidence}%</Badge>
                    {it.sender && <Badge variant="outline">{it.sender}</Badge>}
                  </div>
                  <pre className="text-xs whitespace-pre-wrap rounded-xl bg-muted/50 p-3 max-h-28 overflow-auto">
                    {it.rawText}
                  </pre>
                  {e && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>{locale === "en" ? "Title" : "عنوان"}</Label>
                        <Input
                          value={e.title}
                          onChange={(ev) =>
                            setEdits((prev) => ({
                              ...prev,
                              [it.id]: { ...e, title: ev.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{locale === "en" ? "Amount" : "مبلغ"}</Label>
                        <Input
                          type="number"
                          value={e.amount}
                          onChange={(ev) =>
                            setEdits((prev) => ({
                              ...prev,
                              [it.id]: { ...e, amount: ev.target.value },
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          {formatToman(Number(e.amount) || 0)}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{locale === "en" ? "Account" : "حساب"}</Label>
                        <Select
                          items={accountItems}
                          value={e.accountId}
                          onValueChange={(v) => {
                            if (!v) return;
                            setEdits((prev) => ({
                              ...prev,
                              [it.id]: { ...e, accountId: v },
                            }));
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button disabled={pending} onClick={() => confirm(it.id)}>
                      <Check className="h-4 w-4 me-1" />
                      {locale === "en" ? "Confirm" : "تأیید و ثبت"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => reject(it.id)}
                    >
                      <X className="h-4 w-4 me-1" />
                      {locale === "en" ? "Reject" : "رد"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
