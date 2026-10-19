import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sleepLogs } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { ensureDb } from "@/lib/db/queries";

const schemaBody = z.object({
  date: z.string().min(8),
  bedtime: z.string().optional().nullable(),
  wakeTime: z.string().optional().nullable(),
  hours: z.number().int().min(0).max(24).optional().nullable(),
  quality: z.number().int().min(1).max(5).default(3),
  energy: z.number().int().min(1).max(5).default(3),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const rows = await db
    .select()
    .from(sleepLogs)
    .where(eq(sleepLogs.userId, auth))
    .orderBy(desc(sleepLogs.date))
    .limit(60)
    .all();
  return NextResponse.json({ logs: rows });
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
