import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { habitCompletions, habits } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { ensureDb } from "@/lib/db/queries";

const habitSchema = z.object({
  title: z.string().min(1).max(80),
  color: z.string().default("#10b981"),
  cue: z.string().max(120).optional().nullable(),
  timeOfDay: z.string().max(40).optional().nullable(),
});

function streakFor(dates: string[]): number {
  const set = new Set(dates);
  let streak = 0;
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const today = d.toISOString().slice(0, 10);
  if (!set.has(today)) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const list = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, auth), eq(habits.active, true)))
    .orderBy(desc(habits.createdAt))
    .all();
  const completions = await db
    .select()
    .from(habitCompletions)
    .where(eq(habitCompletions.userId, auth))
    .all();
  const today = new Date().toISOString().slice(0, 10);
  const days7 = lastNDates(7);
  const days30 = lastNDates(30);

  const enriched = list.map((h) => {
    const dates = completions.filter((c) => c.habitId === h.id).map((c) => c.date);
    const set = new Set(dates);
    const weekDone = days7.filter((d) => set.has(d)).length;
    return {
      ...h,
      doneToday: dates.includes(today),
      streak: streakFor(dates),
      weekRate: list.length ? Math.round((weekDone / 7) * 100) : 0,
      weekDone,
    };
  });

  const doneToday = enriched.filter((h) => h.doneToday).length;
  const total = enriched.length;
  const weekCompletions = completions.filter((c) => days7.includes(c.date)).length;
  const weekPossible = Math.max(1, total * 7);
  const weekRate = total === 0 ? 0 : Math.round((weekCompletions / weekPossible) * 100);

  const heatmap = days30.map((date) => {
    const count = completions.filter((c) => c.date === date && list.some((h) => h.id === c.habitId)).length;
    return { date, label: date.slice(8), value: count, max: Math.max(1, total) };
  });

  const pending = enriched.filter((h) => !h.doneToday);

  return NextResponse.json({
    habits: enriched,
    stats: {
      doneToday,
      total,
      weekRate,
      heatmap,
      nextAction: !total ? "add_habit" : pending.length ? "complete_pending" : "all_done",
      pendingTitles: pending.slice(0, 3).map((h) => h.title),
    },
  });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const body = await readJsonObject(request);
  const action = typeof body.action === "string" ? body.action : "create";

  if (action === "toggle") {
    const habitId = String(body.habitId ?? "");
    const date = String(body.date ?? new Date().toISOString().slice(0, 10));
    if (!habitId) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const existing = await db
      .select()
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.habitId, habitId),
          eq(habitCompletions.userId, auth),
          eq(habitCompletions.date, date)
        )
      )
      .get();
    if (existing) {
      await db.delete(habitCompletions).where(eq(habitCompletions.id, existing.id)).run();
      return NextResponse.json({ success: true, done: false });
    }
    const id = nanoid();
    await db
      .insert(habitCompletions)
      .values({ id, habitId, userId: auth, date })
      .run();
    return NextResponse.json({ success: true, done: true });
  }

  const parsed = habitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const id = nanoid();
  await db
    .insert(habits)
    .values({
      id,
      userId: auth,
      title: parsed.data.title,
      color: parsed.data.color,
      cue: parsed.data.cue ?? null,
      timeOfDay: parsed.data.timeOfDay ?? null,
    })
    .run();
  return NextResponse.json({ success: true, id });
}

export async function DELETE(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id" }, { status: 400 });
  await db
    .update(habits)
    .set({ active: false })
    .where(and(eq(habits.id, id), eq(habits.userId, auth)))
    .run();
  return NextResponse.json({ success: true });
}
