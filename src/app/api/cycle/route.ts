import { daySchema, dailyCycleSchema, cycleSummary } from "@/lib/cycle-tracking";
import { getPeriods } from "@/lib/db/cycle-tracking";
import { cycleDailyLogs } from "@/lib/db/schema";
import { toISODate } from "@/lib/format";
import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cycleEntries, cycleSettings } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { ensureDb } from "@/lib/db/queries";

const entrySchema = z.object({
  date: daySchema,
  kind: z.enum(["period_start", "period_end", "symptom", "note"]),
  symptoms: z.array(z.string()).optional(),
  flow: z.enum(["light", "medium", "heavy", "spotting"]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const settingsSchema = z.object({
  avgCycleLength: z.number().int().min(20).max(45).optional(),
  avgPeriodLength: z.number().int().min(2).max(12).optional(),
});

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  let settings = await db
    .select()
    .from(cycleSettings)
    .where(eq(cycleSettings.userId, auth))
    .get();

  if (!settings) {
    await db
      .insert(cycleSettings)
      .values({
        userId: auth,
        avgCycleLength: 28,
        avgPeriodLength: 5,
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .run();
    settings = await db
      .select()
      .from(cycleSettings)
      .where(eq(cycleSettings.userId, auth))
      .get();
  }

  const today = new URL(request.url).searchParams.get("today") ?? toISODate(new Date());
  if (!daySchema.safeParse(today).success) return NextResponse.json({error:"تاریخ نامعتبر"},{status:400});
  const [{periods,archived,legacy}, daily] = await Promise.all([getPeriods(auth),db.select().from(cycleDailyLogs).where(eq(cycleDailyLogs.userId,auth)).orderBy(desc(cycleDailyLogs.date)).all()]);
  const summary = cycleSummary(periods,today,settings!.avgCycleLength);
  return NextResponse.json({settings,periods,archivedPeriods:archived,daily,entries:legacy,summary,nextEstimate:summary.nextEstimate,phase:summary.ongoing ? "menstrual" : "unknown"}, {headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);
  if (body.action === "daily") {
    const parsed = dailyCycleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({error:"ثبت روزانه معتبر نیست"},{status:400});
    const {symptoms,...values} = parsed.data;
    const row = {...values,userId:auth,symptoms:JSON.stringify([...new Set(symptoms)]),updatedAt:new Date()};
    await db.insert(cycleDailyLogs).values({id:`${auth}:cycle-day:${values.date}`,...row}).onConflictDoUpdate({target:cycleDailyLogs.id,set:row}).run();
    return NextResponse.json({success:true});
  }
  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const id = nanoid();
  await db
    .insert(cycleEntries)
    .values({
      id,
      userId: auth,
      date: parsed.data.date,
      kind: parsed.data.kind,
      symptoms: parsed.data.symptoms
        ? JSON.stringify(parsed.data.symptoms)
        : null,
      flow: parsed.data.flow ?? null,
      notes: parsed.data.notes ?? null,
    })
    .run();

  return NextResponse.json({ success: true, id });
}

export async function PATCH(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(cycleSettings)
    .where(eq(cycleSettings.userId, auth))
    .get();

  if (!existing) {
    await db
      .insert(cycleSettings)
      .values({
        userId: auth,
        avgCycleLength: parsed.data.avgCycleLength ?? 28,
        avgPeriodLength: parsed.data.avgPeriodLength ?? 5,
        updatedAt: new Date(),
      })
      .run();
  } else {
    await db
      .update(cycleSettings)
      .set({
        avgCycleLength: parsed.data.avgCycleLength ?? existing.avgCycleLength,
        avgPeriodLength:
          parsed.data.avgPeriodLength ?? existing.avgPeriodLength,
        updatedAt: new Date(),
      })
      .where(eq(cycleSettings.userId, auth))
      .run();
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db
    .delete(cycleEntries)
    .where(and(eq(cycleEntries.id, id), eq(cycleEntries.userId, auth)))
    .run();

  return NextResponse.json({ success: true });
}
