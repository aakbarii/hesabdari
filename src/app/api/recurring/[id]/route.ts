import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ensureDb, db, recurringTransactions } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { id } = await params;
  const existing = db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.id, id))
    .get();
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "تراکنش دوره‌ای یافت نشد" }, { status: 404 });
  }

  const body = await request.json();

  if (typeof body.isActive === "boolean") {
    db.update(recurringTransactions)
      .set({ isActive: body.isActive })
      .where(eq(recurringTransactions.id, id))
      .run();
  }

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
    .from(recurringTransactions)
    .where(eq(recurringTransactions.id, id))
    .get();
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "تراکنش دوره‌ای یافت نشد" }, { status: 404 });
  }

  db.delete(recurringTransactions).where(eq(recurringTransactions.id, id)).run();
  return NextResponse.json({ success: true });
}
