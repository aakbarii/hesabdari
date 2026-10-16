import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { books, courses } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();

  if (body.type === "book") {
    const updateData: any = {};
    if (typeof body.currentPage === "number") updateData.currentPage = body.currentPage;
    if (body.status) updateData.status = body.status;

    db.update(books)
      .set(updateData)
      .where(and(eq(books.id, id), eq(books.userId, auth)))
      .run();
    return NextResponse.json({ success: true });
  }

  if (body.type === "course") {
    const updateData: any = {};
    if (typeof body.completedLessons === "number") updateData.completedLessons = body.completedLessons;
    if (body.status) updateData.status = body.status;

    db.update(courses)
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

  db.delete(books).where(and(eq(books.id, id), eq(books.userId, auth))).run();
  db.delete(courses).where(and(eq(courses.id, id), eq(courses.userId, auth))).run();

  return NextResponse.json({ success: true });
}
