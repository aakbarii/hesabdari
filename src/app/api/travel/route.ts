import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tripExpenses, trips } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { ensureDb } from "@/lib/db/queries";

const tripSchema = z.object({
  title: z.string().min(1).max(80),
  place: z.string().optional().nullable(),
  startDate: z.string().min(8),
  endDate: z.string().optional().nullable(),
  budget: z.number().int().min(0).default(0),
  notes: z.string().optional().nullable(),
});

const expenseSchema = z.object({
  tripId: z.string().min(1),
  title: z.string().min(1),
  amount: z.number().int().min(0),
  category: z.string().default("سایر"),
  date: z.string().min(8),
});

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const list = await db
    .select()
    .from(trips)
    .where(eq(trips.userId, auth))
    .orderBy(desc(trips.startDate))
    .all();
  const expenses = await db
    .select()
    .from(tripExpenses)
    .where(eq(tripExpenses.userId, auth))
    .all();
  return NextResponse.json({ trips: list, expenses });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const body = await readJsonObject(request);
  const action = typeof body.action === "string" ? body.action : "create";

  if (action === "expense") {
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const trip = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, parsed.data.tripId), eq(trips.userId, auth)))
      .get();
    if (!trip) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const id = nanoid();
    await db
      .insert(tripExpenses)
      .values({ id, userId: auth, ...parsed.data })
      .run();
    return NextResponse.json({ success: true, id });
  }

  const parsed = tripSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const id = nanoid();
  await db
    .insert(trips)
    .values({
      id,
      userId: auth,
      title: parsed.data.title,
      place: parsed.data.place ?? null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      budget: parsed.data.budget,
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
  await db.delete(trips).where(and(eq(trips.id, id), eq(trips.userId, auth))).run();
  return NextResponse.json({ success: true });
}
