import { dateInput } from "@/lib/validation";
import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { focusSessions } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { eq, and, desc, gte } from "drizzle-orm";

const sessionSchema = z.object({
  clientId: z.string().uuid().optional(),
  taskName: z.string().trim().min(1, "نام تسک الزامی است").max(200),
  durationMinutes: z.number().int().min(1).max(240).default(25),
  category: z.enum(["work", "study", "coding", "personal"]).default("coding"),
  date: dateInput,
  todoId: z.string().optional().nullable(),
});

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

export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const week = searchParams.get("week") === "1";

  const sessions = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, auth), eq(focusSessions.date, date)))
    .orderBy(desc(focusSessions.createdAt))
    .all();

  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  let weekStats = null;
  if (week) {
    const days = lastNDates(7);
    const weekStart = days[0];
    const weekRows = await db
      .select()
      .from(focusSessions)
      .where(and(eq(focusSessions.userId, auth), gte(focusSessions.date, weekStart)))
      .all();
    const byDay = days.map((d) => ({
      date: d,
      label: d.slice(5),
      value: weekRows
        .filter((s) => s.date === d)
        .reduce((sum, s) => sum + s.durationMinutes, 0),
    }));
    weekStats = {
      totalMinutes: weekRows.reduce((s, r) => s + r.durationMinutes, 0),
      sessionCount: weekRows.length,
      byDay,
    };
  }

  return NextResponse.json({
    sessions,
    totalMinutes,
    sessionCount: sessions.length,
    weekStats,
  });
}

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }

  const id = parsed.data.clientId ? `${auth}:${parsed.data.clientId}` : nanoid();
  await db
    .insert(focusSessions)
    .values({
      id,
      userId: auth,
      taskName: parsed.data.taskName,
      durationMinutes: parsed.data.durationMinutes,
      category: parsed.data.category,
      date: parsed.data.date,
      todoId: parsed.data.todoId ?? null,
    })
    .onConflictDoNothing()
    .run();

  const saved = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.id, id), eq(focusSessions.userId, auth)))
    .get();
  if (
    !saved ||
    saved.taskName !== parsed.data.taskName ||
    saved.durationMinutes !== parsed.data.durationMinutes ||
    saved.date !== parsed.data.date ||
    saved.category !== parsed.data.category
  )
    return NextResponse.json(
      { error: "شناسهٔ جلسه قبلاً با اطلاعات متفاوت ثبت شده است" },
      { status: 409 }
    );
  return NextResponse.json({ success: true, id });
}
