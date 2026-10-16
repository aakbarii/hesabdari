import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb, db, categories } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const existing = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!existing || existing.userId !== auth) {
    return NextResponse.json({ error: "دسته یافت نشد" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  db.update(categories).set(parsed.data).where(eq(categories.id, id)).run();
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
  const existing = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!existing || existing.userId !== auth) {
    return NextResponse.json({ error: "دسته یافت نشد" }, { status: 404 });
  }

  db.delete(categories).where(eq(categories.id, id)).run();
  return NextResponse.json({ ok: true });
}
