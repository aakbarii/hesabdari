import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { dateInput, moneyInput } from "@/lib/validation";
import { validateFinancialReferences } from "@/lib/financial-validation";
import { ensureDb, db, transfers } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const updateSchema = z.object({
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  amount: moneyInput.optional(),
  description: z.string().optional().nullable(),
  date: dateInput.optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const existing = await db.select().from(transfers).where(eq(transfers.id, id)).get();
  if (!existing || existing.userId !== auth) {
    return NextResponse.json({ error: "انتقال یافت نشد" }, { status: 404 });
  }

  const body = await readJsonObject(request);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const fromAccountId = parsed.data.fromAccountId ?? existing.fromAccountId;
  const toAccountId = parsed.data.toAccountId ?? existing.toAccountId;
  for (const accountId of [fromAccountId, toAccountId]) {
    const referenceError = await validateFinancialReferences(auth, { accountId });
    if (referenceError) return referenceError;
  }
  if (fromAccountId === toAccountId) {
    return NextResponse.json(
      { error: "حساب مبدا و مقصد نمی‌توانند یکسان باشند" },
      { status: 400 }
    );
  }

  const updates: Partial<typeof transfers.$inferInsert> = {};
  if (parsed.data.fromAccountId !== undefined) {
    updates.fromAccountId = parsed.data.fromAccountId;
  }
  if (parsed.data.toAccountId !== undefined) {
    updates.toAccountId = parsed.data.toAccountId;
  }
  if (parsed.data.amount !== undefined) updates.amount = parsed.data.amount;
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description;
  }
  if (parsed.data.date !== undefined) {
    updates.date = new Date(parsed.data.date);
  }

  await db.update(transfers).set(updates).where(eq(transfers.id, id)).run();
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
  const existing = await db.select().from(transfers).where(eq(transfers.id, id)).get();
  if (!existing || existing.userId !== auth) {
    return NextResponse.json({ error: "انتقال یافت نشد" }, { status: 404 });
  }

  await db.delete(transfers).where(eq(transfers.id, id)).run();
  return NextResponse.json({ ok: true });
}
