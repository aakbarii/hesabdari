import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb, db, assets } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
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

  const existing = db.select().from(assets).where(eq(assets.id, id)).get();
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "دارایی یافت نشد" }, { status: 404 });
  }

  db.update(assets).set(parsed.data).where(eq(assets.id, id)).run();
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
  const existing = db.select().from(assets).where(eq(assets.id, id)).get();
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "دارایی یافت نشد" }, { status: 404 });
  }

  db.delete(assets).where(eq(assets.id, id)).run();
  return NextResponse.json({ success: true });
}
