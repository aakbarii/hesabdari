"use client";

import { useEffect, useState, useTransition } from "react";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Wallet, Upload } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { toISODate, formatToman } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n";
import moment from "jalali-moment";

type GroupRow = {
  id: string;
  name: string;
  inviteCode: string;
  role: string;
};

type FeedItem = {
  id: string;
  mood: string;
  note: string | null;
  date: string;
  userName: string;
};

const MOODS = ["great", "good", "neutral", "tired", "bad"] as const;

export default function GroupsPage() {
  const { t } = useLocale();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [members, setMembers] = useState<{ name: string; role: string }[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mood, setMood] = useState<(typeof MOODS)[number]>("good");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"mood" | "shop" | "tasks" | "budget" | "petty">("mood");
  const [shopping, setShopping] = useState<Array<{ id: string; title: string; done: boolean }>>([]);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; done: boolean }>>([]);
  const [expenses, setExpenses] = useState<Array<{ id: string; title: string; amount: number }>>([]);
  const [itemTitle, setItemTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [pettyBudget, setPettyBudget] = useState("");
  const [pettyFund, setPettyFund] = useState<{
    id: string;
    monthlyBudget: number;
    managerUserId: string;
    title: string;
  } | null>(null);
  const [pettyItems, setPettyItems] = useState<
    Array<{
      id: string;
      title: string;
      amount: number;
      date: string;
      receiptPath: string | null;
    }>
  >([]);
  const [pettySpent, setPettySpent] = useState(0);
  const [pettyRemaining, setPettyRemaining] = useState(0);
  const [isPending, startTransition] = useTransition();
  const today = toISODate(new Date());
  const jYear = moment().jYear();
  const jMonth = moment().jMonth() + 1;

  const loadGroups = async () => {
    const res = await fetch("/api/groups");
    if (!res.ok) throw new Error("fail");
    const data = await res.json();
    setGroups(data.groups ?? []);
    if (!activeId && data.groups?.[0]) setActiveId(data.groups[0].id);
  };

  const loadPetty = async (groupId: string) => {
    const res = await fetch(
      `/api/groups/petty-cash?groupId=${groupId}&year=${jYear}&month=${jMonth}`
    );
    if (!res.ok) return;
    const data = await res.json();
    setPettyFund(data.fund);
    setPettyItems(data.items ?? []);
    setPettySpent(data.spent ?? 0);
    setPettyRemaining(data.remaining ?? 0);
    if (data.fund?.monthlyBudget != null) {
      setPettyBudget(String(data.fund.monthlyBudget));
    }
  };

  const loadDetail = async (groupId: string) => {
    const res = await fetch(`/api/groups?groupId=${groupId}`);
    if (!res.ok) throw new Error("fail");
    const data = await res.json();
    setFeed(data.feed ?? []);
    setMembers(data.members ?? []);
    const col = await fetch(`/api/groups/collaborate?groupId=${groupId}`);
    if (col.ok) {
      const c = await col.json();
      setShopping(c.shopping ?? []);
      setTasks(c.tasks ?? []);
      setExpenses(c.expenses ?? []);
    }
    await loadPetty(groupId);
  };

  useEffect(() => {
    loadGroups().catch(() => toast.error(t("common.error")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadDetail(activeId).catch(() => toast.error(t("common.error")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const createGroup = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", name }),
        });
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        toast.success(t("groups.created"));
        setName("");
        await loadGroups();
        if (data.id) setActiveId(data.id);
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const joinGroup = () => {
    if (!code.trim()) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join", code }),
        });
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        toast.success(t("groups.joined"));
        setCode("");
        await loadGroups();
        if (data.groupId) setActiveId(data.groupId);
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const shareMood = () => {
    if (!activeId) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "share",
            groupId: activeId,
            mood,
            note: note || null,
            date: today,
          }),
        });
        if (!res.ok) throw new Error("fail");
        toast.success(t("groups.shared"));
        setNote("");
        await loadDetail(activeId);
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const collab = (body: Record<string, unknown>) => {
    if (!activeId) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/groups/collaborate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: activeId, ...body }),
        });
        if (!res.ok) throw new Error("fail");
        setItemTitle("");
        setExpAmount("");
        await loadDetail(activeId);
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const setPettyCash = () => {
    if (!activeId) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/groups/petty-cash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create-fund",
            groupId: activeId,
            monthlyBudget: parseInt(pettyBudget.replace(/,/g, ""), 10) || 0,
            year: jYear,
            month: jMonth,
          }),
        });
        if (!res.ok) throw new Error("fail");
        toast.success(t("common.success"));
        await loadPetty(activeId);
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const addPettyItem = () => {
    if (!activeId || !pettyFund) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/groups/petty-cash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add-item",
            groupId: activeId,
            pettyCashId: pettyFund.id,
            title: itemTitle,
            amount: parseInt(expAmount.replace(/,/g, ""), 10) || 0,
            date: today,
          }),
        });
        if (!res.ok) throw new Error("fail");
        setItemTitle("");
        setExpAmount("");
        toast.success(t("common.success"));
        await loadPetty(activeId);
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const uploadReceipt = (itemId: string, file: File) => {
    if (!activeId) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("itemId", itemId);
        fd.set("file", file);
        const res = await fetch("/api/groups/petty-cash", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error("fail");
        toast.success(t("common.success"));
        await loadPetty(activeId);
      } catch {
        toast.error(t("common.error"));
      }
    });
  };

  const active = groups.find((g) => g.id === activeId);

  return (
    <>
      <Header title={t("groups.title")} />
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 motion-stagger">
        <PageHero
          heroKey="groups"
          title={t("groups.title")}
          subtitle={t("groups.subtitle")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("groups.create")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>{t("groups.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button disabled={isPending} onClick={createGroup} className="w-full">
                {t("groups.create")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("groups.join")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>{t("groups.code")}</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  dir="ltr"
                  className="tracking-widest"
                />
              </div>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={joinGroup}
                className="w-full"
              >
                {t("groups.join")}
              </Button>
            </CardContent>
          </Card>
        </div>

        {!groups.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("groups.noGroups")}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveId(g.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    activeId === g.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {active && (
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{active.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("groups.inviteHint")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(active.inviteCode);
                        toast.success(active.inviteCode);
                      } catch {
                        toast.message(active.inviteCode);
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span dir="ltr">{active.inviteCode}</span>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      {t("groups.members")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {members.map((m) => (
                        <Badge key={m.name + m.role} variant="secondary">
                          {m.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["mood", "groups.tab.mood"],
                        ["shop", "groups.tab.shop"],
                        ["tasks", "groups.tab.tasks"],
                        ["budget", "groups.tab.budget"],
                        ["petty", "groups.tab.petty"],
                      ] as const
                    ).map(([id, key]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs",
                          tab === id
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>

                  {tab === "mood" && (
                    <>
                      <div className="space-y-3 rounded-2xl border p-4">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Share2 className="h-4 w-4 text-primary" />
                          {t("groups.shareMood")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {MOODS.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setMood(m)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs",
                                mood === m
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "hover:bg-muted"
                              )}
                            >
                              {t(`mood.${m}` as MessageKey)}
                            </button>
                          ))}
                        </div>
                        <Input
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="…"
                        />
                        <Button disabled={isPending} onClick={shareMood}>
                          {t("groups.shareMood")}
                        </Button>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          {t("groups.feed")}
                        </p>
                        <div className="space-y-2">
                          {feed.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border px-3 py-2.5 text-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{item.userName}</span>
                                <Badge variant="outline">
                                  {t(`mood.${item.mood}` as MessageKey)}
                                </Badge>
                              </div>
                              {item.note && (
                                <p className="text-muted-foreground mt-1">{item.note}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {tab === "shop" && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">{t("groups.shopping")}</p>
                      <div className="flex gap-2">
                        <Input
                          value={itemTitle}
                          onChange={(e) => setItemTitle(e.target.value)}
                          placeholder="…"
                        />
                        <Button
                          disabled={isPending}
                          onClick={() =>
                            collab({ kind: "shopping", title: itemTitle })
                          }
                        >
                          {t("common.add")}
                        </Button>
                      </div>
                      {shopping.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            collab({ kind: "toggle-shopping", id: s.id })
                          }
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-sm text-start",
                            s.done && "opacity-50 line-through"
                          )}
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {tab === "tasks" && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">{t("groups.tasks")}</p>
                      <div className="flex gap-2">
                        <Input
                          value={itemTitle}
                          onChange={(e) => setItemTitle(e.target.value)}
                          placeholder="…"
                        />
                        <Button
                          disabled={isPending}
                          onClick={() => collab({ kind: "task", title: itemTitle })}
                        >
                          {t("common.add")}
                        </Button>
                      </div>
                      {tasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() =>
                            collab({ kind: "toggle-task", id: task.id })
                          }
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-sm text-start",
                            task.done && "opacity-50 line-through"
                          )}
                        >
                          {task.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {tab === "budget" && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">{t("groups.budget")}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={itemTitle}
                          onChange={(e) => setItemTitle(e.target.value)}
                          placeholder={t("groups.name")}
                        />
                        <Input
                          value={expAmount}
                          onChange={(e) => setExpAmount(e.target.value)}
                          type="number"
                          placeholder="0"
                        />
                      </div>
                      <Button
                        disabled={isPending}
                        onClick={() =>
                          collab({
                            kind: "expense",
                            title: itemTitle,
                            amount: Number(expAmount) || 0,
                            date: today,
                          })
                        }
                      >
                        {t("common.add")}
                      </Button>
                      {expenses.map((e) => (
                        <div
                          key={e.id}
                          className="flex justify-between rounded-xl border px-3 py-2 text-sm"
                        >
                          <span>{e.title}</span>
                          <span>{formatToman(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === "petty" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">{t("groups.petty.title")}</p>
                      </div>
                      <div className="space-y-2 rounded-2xl border p-4">
                        <Label>{t("groups.petty.budget")}</Label>
                        <Input
                          value={pettyBudget}
                          onChange={(e) => setPettyBudget(e.target.value)}
                          type="number"
                          placeholder="0"
                        />
                        <Button disabled={isPending} onClick={setPettyCash}>
                          {t("groups.petty.set")}
                        </Button>
                        {pettyFund && (
                          <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                            <div className="rounded-xl bg-muted/50 px-3 py-2">
                              <p className="text-xs text-muted-foreground">
                                {t("groups.petty.spent")}
                              </p>
                              <p className="font-semibold">{formatToman(pettySpent)}</p>
                            </div>
                            <div className="rounded-xl bg-muted/50 px-3 py-2">
                              <p className="text-xs text-muted-foreground">
                                {t("groups.petty.remaining")}
                              </p>
                              <p className="font-semibold">
                                {formatToman(pettyRemaining)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {pettyFund && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium">{t("groups.petty.addItem")}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={itemTitle}
                              onChange={(e) => setItemTitle(e.target.value)}
                              placeholder={t("groups.petty.item")}
                            />
                            <Input
                              value={expAmount}
                              onChange={(e) => setExpAmount(e.target.value)}
                              type="number"
                              placeholder="0"
                            />
                          </div>
                          <Button disabled={isPending || !itemTitle.trim()} onClick={addPettyItem}>
                            {t("common.add")}
                          </Button>
                          <div className="space-y-2">
                            {pettyItems.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-xl border px-3 py-2.5 text-sm space-y-2"
                              >
                                <div className="flex justify-between gap-2">
                                  <span className="font-medium">{item.title}</span>
                                  <span>{formatToman(item.amount)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {item.date}
                                  </span>
                                  {item.receiptPath ? (
                                    <a
                                      href={`/api/receipts/${item.receiptPath}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline"
                                    >
                                      {t("groups.petty.receipt")}
                                    </a>
                                  ) : (
                                    <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                      <Upload className="h-3.5 w-3.5" />
                                      {t("groups.petty.receipt")}
                                      <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) uploadReceipt(item.id, f);
                                          e.target.value = "";
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
