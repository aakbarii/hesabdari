import { dateInput } from "@/lib/validation";
import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sleepLogs } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { ensureDb, getUserSettings } from "@/lib/db/queries";

const schemaBody = z.object({
  date: dateInput,
  bedtime: z.string().optional().nullable(),
  wakeTime: z.string().optional().nullable(),
  hours: z.number().min(0).max(24).optional().nullable(),
  quality: z.number().int().min(1).max(5).default(3),
  energy: z.number().int().min(1).max(5).default(3),
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

function suggestBedtime(goalHours: number, debtHours: number): string {
  // Aim to wake ~07:00; add ~30m earlier per hour of debt (capped)
  const wakeHour = 7;
  const extra = Math.min(2, Math.round(debtHours * 0.5 * 2) / 2);
  const sleepHours = goalHours + extra;
  let bedHour = wakeHour - sleepHours;
  while (bedHour < 0) bedHour += 24;
  const h = Math.floor(bedHour);
  const m = Math.round((bedHour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m === 60 ? 0 : m).padStart(2, "0")}`;
}

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const settings = await getUserSettings(auth);
  const goalHours = settings.healthTargets.sleepHours;

  const rows = await db
    .select()
    .from(sleepLogs)
    .where(eq(sleepLogs.userId, auth))
    .orderBy(desc(sleepLogs.date))
    .limit(60)
    .all();

  const days7 = lastNDates(7);
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const today = days7[days7.length - 1];
  const todayLog = byDate.get(today) ?? null;

  let debtHours = 0;
  const trend = days7.map((date) => {
    const log = byDate.get(date);
    const hours = log?.hours ?? null;
    if (hours == null) {
      debtHours += goalHours * 0.5; // light penalty for missing night
    } else if (hours < goalHours) {
      debtHours += goalHours - hours;
    }
    return {
      date,
      label: date.slice(5),
      hours: hours ?? 0,
      quality: log?.quality ?? 0,
      energy: log?.energy ?? 0,
      logged: !!log,
    };
  });

  debtHours = Math.round(debtHours * 10) / 10;
  const avgQuality =
    trend.filter((t) => t.logged).reduce((s, t) => s + t.quality, 0) /
      Math.max(1, trend.filter((t) => t.logged).length) || 0;
  const avgHours =
    trend.filter((t) => t.logged && t.hours > 0).reduce((s, t) => s + t.hours, 0) /
      Math.max(1, trend.filter((t) => t.logged && t.hours > 0).length) || 0;

  const nextAction = !todayLog
    ? "log_today"
    : debtHours >= 2
      ? "catch_up"
      : (todayLog.hours ?? 0) >= goalHours
        ? "on_track"
        : "short_night";

  return NextResponse.json({
    logs: rows,
    stats: {
      goalHours,
      debtHours7d: debtHours,
      avgHours7d: Math.round(avgHours * 10) / 10,
      avgQuality7d: Math.round(avgQuality * 10) / 10,
      suggestedBedtime: suggestBedtime(goalHours, debtHours),
      today: todayLog,
      trend,
      nextAction,
    },
  });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const parsed = schemaBody.safeParse(await readJsonObject(request));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const existing = await db
    .select()
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, auth), eq(sleepLogs.date, parsed.data.date)))
    .get();

  if (existing) {
    await db
      .update(sleepLogs)
      .set({
        bedtime: parsed.data.bedtime ?? null,
        wakeTime: parsed.data.wakeTime ?? null,
        hours: parsed.data.hours ?? null,
        quality: parsed.data.quality,
        energy: parsed.data.energy,
        notes: parsed.data.notes ?? null,
      })
      .where(eq(sleepLogs.id, existing.id))
      .run();
    return NextResponse.json({ success: true, id: existing.id });
  }

  const id = nanoid();
  await db
    .insert(sleepLogs)
    .values({ id, userId: auth, ...parsed.data })
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
    .delete(sleepLogs)
    .where(and(eq(sleepLogs.id, id), eq(sleepLogs.userId, auth)))
    .run();
  return NextResponse.json({ success: true });
}
