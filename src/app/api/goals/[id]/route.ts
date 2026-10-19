import { readJsonObject } from "@/lib/validation";
import { dateInput, moneyInput } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb, db, goals } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: moneyInput.optional(),
  deadline: dateInput.optional().nullable(),
  color: z.string().optional(),
  status: z.enum(["active", "completed"]).optional(),
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

  const existing = await db.select().from(goals).where(eq(goals.id, id)).get();
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "هدف یافت نشد" }, { status: 404 });
  }

  const updates: Partial<typeof goals.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.targetAmount !== undefined) {
    updates.targetAmount = parsed.data.targetAmount;
  }
  if (parsed.data.color !== undefined) updates.color = parsed.data.color;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.deadline !== undefined) {
    updates.deadline = parsed.data.deadline
      ? new Date(parsed.data.deadline)
      : null;
  }

  await db.update(goals).set(updates).where(eq(goals.id, id)).run();
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
  const existing = await db.select().from(goals).where(eq(goals.id, id)).get();
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "هدف یافت نشد" }, { status: 404 });
  }

  await db.delete(goals).where(eq(goals.id, id)).run();
  return NextResponse.json({ success: true });
}
