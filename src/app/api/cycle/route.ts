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
  date: z.string().min(8),
  kind: z.enum(["period_start", "period_end", "symptom", "note"]),
  symptoms: z.array(z.string()).optional(),
  flow: z.enum(["light", "medium", "heavy", "spotting"]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const settingsSchema = z.object({
  avgCycleLength: z.number().int().min(20).max(45).optional(),
  avgPeriodLength: z.number().int().min(2).max(12).optional(),
});

function estimateNext(
  starts: string[],
  cycleLength: number
): string | null {
  if (!starts.length) return null;
  const last = new Date(starts[0] + "T12:00:00");
  last.setDate(last.getDate() + cycleLength);
  return last.toISOString().slice(0, 10);
}

function currentPhase(
  starts: string[],
  periodLength: number,
  cycleLength: number
): string {
  if (!starts.length) return "unknown";
  const last = new Date(starts[0] + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const day = Math.floor((today.getTime() - last.getTime()) / 86400000) + 1;
  if (day < 1 || day > cycleLength + 7) return "unknown";
  if (day <= periodLength) return "menstrual";
  if (day <= 13) return "follicular";
  if (day <= 16) return "ovulation";
  return "luteal";
}

export async function GET() {
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
      .run();
    settings = await db
      .select()
      .from(cycleSettings)
      .where(eq(cycleSettings.userId, auth))
      .get();
  }

  const entries = await db
    .select()
    .from(cycleEntries)
    .where(eq(cycleEntries.userId, auth))
    .orderBy(desc(cycleEntries.date))
    .limit(90)
    .all();

  const starts = entries
    .filter((e) => e.kind === "period_start")
    .map((e) => e.date);

  return NextResponse.json({
    settings,
    entries,
    nextEstimate: estimateNext(starts, settings!.avgCycleLength),
    phase: currentPhase(
      starts,
      settings!.avgPeriodLength,
      settings!.avgCycleLength
    ),
  });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);
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
