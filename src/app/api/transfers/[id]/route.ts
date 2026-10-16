import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb, db, transfers } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const updateSchema = z.object({
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
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

  const { id } = await params;
  const existing = db.select().from(transfers).where(eq(transfers.id, id)).get();
  if (!existing || existing.userId !== auth) {
    return NextResponse.json({ error: "انتقال یافت نشد" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const fromAccountId = parsed.data.fromAccountId ?? existing.fromAccountId;
  const toAccountId = parsed.data.toAccountId ?? existing.toAccountId;
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

  db.update(transfers).set(updates).where(eq(transfers.id, id)).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const existing = db.select().from(transfers).where(eq(transfers.id, id)).get();
  if (!existing || existing.userId !== auth) {
    return NextResponse.json({ error: "انتقال یافت نشد" }, { status: 404 });
  }

  db.delete(transfers).where(eq(transfers.id, id)).run();
  return NextResponse.json({ ok: true });
}
