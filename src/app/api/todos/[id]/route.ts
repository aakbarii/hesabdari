import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb, db, todos } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  area: z.enum(["work", "personal", "health", "home", "other"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["active", "done"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const row = db.select().from(todos).where(eq(todos.id, id)).get();
  if (!row || row.userId !== auth) {
    return NextResponse.json({ error: "کار یافت نشد" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const updates: Partial<typeof todos.$inferInsert> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description;
  }
  if (parsed.data.area !== undefined) updates.area = parsed.data.area;
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
  if (parsed.data.dueDate !== undefined) {
    updates.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status;
    updates.completedAt =
      parsed.data.status === "done" ? new Date() : null;
  }

  db.update(todos).set(updates).where(eq(todos.id, id)).run();
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
  const row = db.select().from(todos).where(eq(todos.id, id)).get();
  if (!row || row.userId !== auth) {
    return NextResponse.json({ error: "کار یافت نشد" }, { status: 404 });
  }

  db.delete(todos).where(eq(todos.id, id)).run();
  return NextResponse.json({ ok: true });
}
