import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import {
  ensureDb,
  db,
  debts,
  debtPayments,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { z } from "zod";

const debtSchema = z.object({
  personName: z.string().min(1),
  type: z.enum(["owed", "owing"]),
  totalAmount: z.number().positive(),
  description: z.string().optional(),
  dueDate: z.string().optional().nullable(),
});

const paymentSchema = z.object({
  debtId: z.string(),
  amount: z.number().positive(),
  accountId: z.string().optional().nullable(),
  date: z.string(),
  note: z.string().optional(),
});

export async function GET() {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const list = db
    .select()
    .from(debts)
    .where(eq(debts.userId, userId))
    .orderBy(desc(debts.createdAt))
    .all();

  return NextResponse.json(list);
}

export async function POST(request: Request) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();

  if (body.debtId) {
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }

    const { debtId, amount, accountId, date, note } = parsed.data;
    const debt = db.select().from(debts).where(eq(debts.id, debtId)).get();
    if (!debt || debt.userId !== userId) {
      return NextResponse.json({ error: "بدهی یافت نشد" }, { status: 404 });
    }

    const paymentId = nanoid();
    db.insert(debtPayments)
      .values({
        id: paymentId,
        debtId,
        accountId: accountId ?? null,
        amount,
        date: new Date(date),
        note,
      })
      .run();

    const newPaid = debt.paidAmount + amount;
    const status = newPaid >= debt.totalAmount ? "settled" : "active";
    db.update(debts)
      .set({ paidAmount: newPaid, status })
      .where(eq(debts.id, debtId))
      .run();

    return NextResponse.json({ id: paymentId });
  }

  const parsed = debtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const id = nanoid();
  const { personName, type, totalAmount, description, dueDate } = parsed.data;

  db.insert(debts)
    .values({
      id,
      userId,
      personName,
      type,
      totalAmount,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
    })
    .run();

  return NextResponse.json({ id });
}
