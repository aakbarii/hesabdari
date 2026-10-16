import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb, db, transactions, autoCategorize } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const updateSchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  type: z.enum(["income", "expense"]).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional().nullable(),
  date: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const existing = db
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
    const auto = autoCategorize(
      userId,
      parsed.data.description,
      type
    );
    if (auto) updates.categoryId = auto;
  }

  db.update(transactions)
    .set(updates as Partial<typeof transactions.$inferInsert>)
    .where(eq(transactions.id, id))
    .run();

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { id } = await params;
  const existing = db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .get();
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "تراکنش یافت نشد" }, { status: 404 });
  }

  db.delete(transactions).where(eq(transactions.id, id)).run();
  return NextResponse.json({ success: true });
}
