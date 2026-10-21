import { dateInput } from "@/lib/validation";
import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { tripExpenses, trips } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import {
  ensureDb,
  db,
  transactions,
  categories,
} from "@/lib/db/queries";

const tripSchema = z.object({
  title: z.string().min(1).max(80),
  place: z.string().optional().nullable(),
  startDate: dateInput,
  endDate: dateInput.optional().nullable(),
  budget: z.number().int().min(0).default(0),
  notes: z.string().optional().nullable(),
});

const expenseSchema = z.object({
  tripId: z.string().min(1),
  title: z.string().min(1),
  amount: z.number().int().min(0),
  category: z.string().default("سایر"),
  date: dateInput,
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

  if (action === "to-transaction") {
    const expenseId = String(body.expenseId ?? "");
    const accountId = String(body.accountId ?? "");
    if (!expenseId || !accountId) {
      return NextResponse.json({ error: "expenseId و accountId لازم است" }, { status: 400 });
    }
    const expense = await db
      .select()
      .from(tripExpenses)
      .where(and(eq(tripExpenses.id, expenseId), eq(tripExpenses.userId, auth)))
      .get();
    if (!expense) return NextResponse.json({ error: "not found" }, { status: 404 });
    const trip = await db
      .select()
      .from(trips)
      .where(eq(trips.id, expense.tripId))
      .get();
    const cat = await db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, auth), eq(categories.type, "expense")))
      .get();
    const txId = nanoid();
    await db
      .insert(transactions)
      .values({
        id: txId,
        userId: auth,
        accountId,
        categoryId: cat?.id ?? null,
        type: "expense",
        amount: expense.amount,
        description: `سفر «${trip?.title ?? ""}»: ${expense.title}`,
        date: new Date(expense.date),
      })
      .run();
    return NextResponse.json({ success: true, transactionId: txId });
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
