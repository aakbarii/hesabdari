import { readJsonObject } from "@/lib/validation";
import { dateInput, moneyInput } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb, db, debts } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const updateSchema = z.object({
  personName: z.string().min(1).optional(),
  type: z.enum(["owed", "owing"]).optional(),
  totalAmount: moneyInput.optional(),
  description: z.string().optional().nullable(),
  dueDate: dateInput.optional().nullable(),
  status: z.enum(["active", "settled"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const existing = await db.select().from(debts).where(eq(debts.id, id)).get();
  if (!existing || existing.userId !== auth) {
    return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  }

  const body = await readJsonObject(request);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const updates: Partial<typeof debts.$inferInsert> = {};
  if (parsed.data.personName !== undefined) updates.personName = parsed.data.personName;
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.totalAmount !== undefined) updates.totalAmount = parsed.data.totalAmount;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.dueDate !== undefined) {
    updates.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }

  if (updates.totalAmount !== undefined && updates.totalAmount < existing.paidAmount) {
    return NextResponse.json(
      { error: "مبلغ کل نمی‌تواند کمتر از پرداخت‌شده باشد" },
      { status: 400 }
    );
  }

  await db.update(debts).set(updates).where(eq(debts.id, id)).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const existing = await db.select().from(debts).where(eq(debts.id, id)).get();
  if (!existing || existing.userId !== auth) {
    return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  }

  await db.delete(debts).where(eq(debts.id, id)).run();
  return NextResponse.json({ ok: true });
}
