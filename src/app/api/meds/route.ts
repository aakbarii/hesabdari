import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { medicationLogs, medications } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { ensureDb } from "@/lib/db/queries";

const medSchema = z.object({
  name: z.string().min(1).max(80),
  dose: z.string().optional().nullable(),
  schedule: z.enum(["daily", "twice_daily", "as_needed", "weekly"]).default("daily"),
  reminderHour: z.number().int().min(0).max(23).default(9),
  notes: z.string().optional().nullable(),
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

function expectedDoses(schedule: string): number {
  if (schedule === "twice_daily") return 2;
  if (schedule === "as_needed") return 0;
  if (schedule === "weekly") return 1 / 7;
  return 1;
}

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const meds = await db
    .select()
    .from(medications)
    .where(eq(medications.userId, auth))
    .orderBy(desc(medications.createdAt))
    .all();
  const today = new Date().toISOString().slice(0, 10);
  const days7 = lastNDates(7);
  const weekStart = days7[0];

  const logsToday = await db
    .select()
    .from(medicationLogs)
    .where(and(eq(medicationLogs.userId, auth), eq(medicationLogs.date, today)))
    .all();

  const logsWeek = await db
    .select()
    .from(medicationLogs)
    .where(and(eq(medicationLogs.userId, auth), gte(medicationLogs.date, weekStart)))
    .all();

  const recentLogs = await db
    .select()
    .from(medicationLogs)
    .where(eq(medicationLogs.userId, auth))
    .orderBy(desc(medicationLogs.date), desc(medicationLogs.createdAt))
    .limit(40)
    .all();

  const activeDaily = meds.filter((m) => m.schedule !== "as_needed");
  const todayExpected = activeDaily.reduce((s, m) => s + Math.ceil(expectedDoses(m.schedule)), 0);
  const todayTaken = logsToday.filter((l) => l.taken).length;
  const weekExpected = activeDaily.reduce((s, m) => {
    const perDay = expectedDoses(m.schedule);
    return s + Math.round(perDay * 7);
  }, 0);
  const weekTaken = logsWeek.filter((l) => l.taken).length;

  const adherenceToday =
    todayExpected === 0 ? 100 : Math.min(100, Math.round((todayTaken / todayExpected) * 100));
  const adherenceWeek =
    weekExpected === 0 ? 100 : Math.min(100, Math.round((weekTaken / Math.max(1, weekExpected)) * 100));

  const pending = activeDaily.filter((m) => {
    const need = Math.ceil(expectedDoses(m.schedule));
    const got = logsToday.filter((l) => l.medicationId === m.id && l.taken).length;
    return got < need;
  });

  const medName = new Map(meds.map((m) => [m.id, m.name]));
  const history = recentLogs.map((l) => ({
    id: l.id,
    date: l.date,
    medicationId: l.medicationId,
    name: medName.get(l.medicationId) ?? "—",
    taken: l.taken,
  }));

  return NextResponse.json({
    meds,
    logsToday,
    stats: {
      adherenceToday,
      adherenceWeek,
      takenToday: todayTaken,
      expectedToday: todayExpected,
      pendingCount: pending.length,
      nextAction: pending.length ? "take_pending" : meds.length ? "all_done" : "add_med",
      history,
    },
  });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const body = await readJsonObject(request);
  const action = typeof body.action === "string" ? body.action : "create";

  if (action === "take") {
    const medicationId = String(body.medicationId ?? "");
    const date = String(body.date ?? new Date().toISOString().slice(0, 10));
    if (!medicationId) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const id = nanoid();
    await db
      .insert(medicationLogs)
      .values({ id, medicationId, userId: auth, date, taken: true })
      .run();
    return NextResponse.json({ success: true, id });
  }

  const parsed = medSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const id = nanoid();
  await db
    .insert(medications)
    .values({
      id,
      userId: auth,
      name: parsed.data.name,
      dose: parsed.data.dose ?? null,
      schedule: parsed.data.schedule,
      reminderHour: parsed.data.reminderHour,
      notes: parsed.data.notes ?? null,
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
    .delete(medications)
    .where(and(eq(medications.id, id), eq(medications.userId, auth)))
    .run();
  return NextResponse.json({ success: true });
}
