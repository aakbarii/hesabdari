import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb, db, routines } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  weeklyDays: z.array(z.number().min(0).max(6)).optional().nullable(),
  timeOfDay: z.string().optional().nullable(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const row = db.select().from(routines).where(eq(routines.id, id)).get();
  if (!row || row.userId !== auth) {
    return NextResponse.json({ error: "عادت یافت نشد" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const updates: Partial<typeof routines.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description;
  }
  if (parsed.data.frequency !== undefined) updates.frequency = parsed.data.frequency;
  if (parsed.data.weeklyDays !== undefined) {
    updates.weeklyDays = parsed.data.weeklyDays
      ? JSON.stringify(parsed.data.weeklyDays)
      : null;
  }
  if (parsed.data.timeOfDay !== undefined) updates.timeOfDay = parsed.data.timeOfDay;
  if (parsed.data.color !== undefined) updates.color = parsed.data.color;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  db.update(routines).set(updates).where(eq(routines.id, id)).run();
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
  const row = db.select().from(routines).where(eq(routines.id, id)).get();
  if (!row || row.userId !== auth) {
    return NextResponse.json({ error: "عادت یافت نشد" }, { status: 404 });
  }

  db.delete(routines).where(eq(routines.id, id)).run();
  return NextResponse.json({ ok: true });
}
