import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
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
  const logs = await db
    .select()
    .from(medicationLogs)
    .where(and(eq(medicationLogs.userId, auth), eq(medicationLogs.date, today)))
    .all();
  return NextResponse.json({ meds, logsToday: logs });
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
