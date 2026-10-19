import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { books, courses } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("book"), currentPage: z.number().int().nonnegative().optional(), status: z.enum(["want_to_read", "reading", "completed"]).optional() }),
  z.object({ type: z.literal("course"), completedLessons: z.number().int().nonnegative().optional(), status: z.enum(["in_progress", "completed"]).optional() }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "اطلاعات پیشرفت نامعتبر است" }, { status: 400 });
  const body = parsed.data;

  if (body.type === "book") {
    const existing = await db.select().from(books).where(and(eq(books.id, id), eq(books.userId, auth))).get();
    if (!existing) return NextResponse.json({ error: "کتاب یافت نشد" }, { status: 404 });
    if (body.currentPage !== undefined && body.currentPage > existing.totalPages) return NextResponse.json({ error: "صفحه فعلی از تعداد صفحات بیشتر است" }, { status: 400 });
    const updateData: Partial<typeof books.$inferInsert> = {};
    if (typeof body.currentPage === "number") updateData.currentPage = body.currentPage;
    if (body.status) updateData.status = body.status;

    if (!Object.keys(updateData).length) return NextResponse.json({ error: "تغییری ارسال نشده است" }, { status: 400 });
    await db.update(books)
      .set(updateData)
      .where(and(eq(books.id, id), eq(books.userId, auth)))
      .run();
    return NextResponse.json({ success: true });
  }

  if (body.type === "course") {
    const existing = await db.select().from(courses).where(and(eq(courses.id, id), eq(courses.userId, auth))).get();
    if (!existing) return NextResponse.json({ error: "دوره یافت نشد" }, { status: 404 });
    if (body.completedLessons !== undefined && body.completedLessons > existing.totalLessons) return NextResponse.json({ error: "پیشرفت از تعداد جلسات بیشتر است" }, { status: 400 });
    const updateData: Partial<typeof courses.$inferInsert> = {};
    if (typeof body.completedLessons === "number") updateData.completedLessons = body.completedLessons;
    if (body.status) updateData.status = body.status;

    if (!Object.keys(updateData).length) return NextResponse.json({ error: "تغییری ارسال نشده است" }, { status: 400 });
    await db.update(courses)
      .set(updateData)
      .where(and(eq(courses.id, id), eq(courses.userId, auth)))
      .run();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "نوع مشخص نشده است" }, { status: 400 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  await db.delete(books).where(and(eq(books.id, id), eq(books.userId, auth))).run();
  await db.delete(courses).where(and(eq(courses.id, id), eq(courses.userId, auth))).run();

  return NextResponse.json({ success: true });
}
