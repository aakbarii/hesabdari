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
});

function streakFor(dates: string[]): number {
  const set = new Set(dates);
  let streak = 0;
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  // allow missing today: start from yesterday if today not done
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
  const enriched = list.map((h) => {
    const dates = completions.filter((c) => c.habitId === h.id).map((c) => c.date);
    return {
      ...h,
      doneToday: dates.includes(today),
      streak: streakFor(dates),
    };
  });
  return NextResponse.json({ habits: enriched });
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
