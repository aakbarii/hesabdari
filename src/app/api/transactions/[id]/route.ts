import { readJsonObject } from "@/lib/validation";
import { validateFinancialReferences } from "@/lib/financial-validation";
import { dateInput, moneyInput } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb, db, transactions, autoCategorize } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const updateSchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  type: z.enum(["income", "expense"]).optional(),
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
  const userId = auth;

  const { id } = await params;
  const body = await readJsonObject(request);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .get();
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "تراکنش یافت نشد" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.date) updates.date = new Date(parsed.data.date);

  if (
    parsed.data.description &&
    (parsed.data.categoryId === undefined || parsed.data.categoryId === null)
  ) {
    const type = parsed.data.type ?? existing.type;
    const auto = await autoCategorize(
      userId,
      parsed.data.description,
      type
    );
    if (auto) updates.categoryId = auto;
  }

  const referenceError = await validateFinancialReferences(userId, {
    accountId: parsed.data.accountId ?? existing.accountId,
    categoryId: (updates.categoryId !== undefined ? updates.categoryId : existing.categoryId) as string | null,
    type: parsed.data.type ?? existing.type,
  });
  if (referenceError) return referenceError;

  await db.update(transactions)
    .set(updates as Partial<typeof transactions.$inferInsert>)
    .where(eq(transactions.id, id))
    .run();

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { id } = await params;
  const existing = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .get();
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "تراکنش یافت نشد" }, { status: 404 });
  }

  await db.delete(transactions).where(eq(transactions.id, id)).run();
  return NextResponse.json({ success: true });
}
