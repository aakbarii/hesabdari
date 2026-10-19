import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  ensureDb,
  db,
  accounts,
  getAccountBalance,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["cash", "bank", "card", "wallet"]).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
  /** Set displayed balance by adjusting initialBalance */
  balance: z.number().optional(),
  initialBalance: z.number().optional(),
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
    .from(accounts)
    .where(eq(accounts.id, id))
    .get();
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "حساب یافت نشد" }, { status: 404 });
  }

  const updates: Partial<typeof accounts.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  if (parsed.data.balance !== undefined) {
    const current = await getAccountBalance(id);
    const delta = parsed.data.balance - current;
    updates.initialBalance = existing.initialBalance + delta;
  } else if (parsed.data.initialBalance !== undefined) {
    updates.initialBalance = parsed.data.initialBalance;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(accounts).set(updates).where(eq(accounts.id, id)).run();
  }

  const updated = await db.select().from(accounts).where(eq(accounts.id, id)).get();
  return NextResponse.json({ ...updated, balance: await getAccountBalance(id) });
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
    .from(accounts)
    .where(eq(accounts.id, id))
    .get();
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "حساب یافت نشد" }, { status: 404 });
  }

  await db.delete(accounts).where(eq(accounts.id, id)).run();
  return NextResponse.json({ success: true });
}
