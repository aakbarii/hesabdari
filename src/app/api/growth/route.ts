import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { books, courses } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { eq, desc } from "drizzle-orm";

const bookSchema = z.object({
  title: z.string().min(1, "عنوان کتاب الزامی است"),
  author: z.string().min(1, "نام نویسنده الزامی است"),
  totalPages: z.number().int().min(1).max(100000),
  currentPage: z.number().int().min(0).max(100000).default(0),
  status: z.enum(["want_to_read", "reading", "completed"]).default("reading"),
  category: z.string().default("توسعه فردی"),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const courseSchema = z.object({
  title: z.string().min(1, "عنوان دوره الزامی است"),
  platform: z.string().default("Online"),
  totalLessons: z.number().int().min(1).max(100000),
  completedLessons: z.number().int().min(0).max(100000).default(0),
  status: z.enum(["in_progress", "completed"]).default("in_progress"),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const userBooks = await db.select().from(books).where(eq(books.userId, auth)).orderBy(desc(books.createdAt)).all();
  const userCourses = await db.select().from(courses).where(eq(courses.userId, auth)).orderBy(desc(courses.createdAt)).all();

  return NextResponse.json({
    books: userBooks,
    courses: userCourses,
  });
}

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);

  if (body.kind === "course") {
    const parsed = courseSchema.safeParse(body);
    if (!parsed.success || parsed.data.completedLessons > parsed.data.totalLessons) {
      return NextResponse.json({ error: "اطلاعات دوره نامعتبر است" }, { status: 400 });
    }
    const id = nanoid();
    await db.insert(courses)
      .values({
        id,
        userId: auth,
        title: parsed.data.title,
        platform: parsed.data.platform,
        totalLessons: parsed.data.totalLessons,
        completedLessons: parsed.data.status === "completed" ? parsed.data.totalLessons : parsed.data.completedLessons,
        status: parsed.data.completedLessons >= parsed.data.totalLessons ? "completed" : parsed.data.status,
        notes: parsed.data.notes ?? null,
      })
      .run();
    return NextResponse.json({ success: true, id });
  }

  const parsed = bookSchema.safeParse(body);
  if (!parsed.success || parsed.data.currentPage > parsed.data.totalPages) {
    return NextResponse.json({ error: "اطلاعات کتاب نامعتبر است" }, { status: 400 });
  }

  const id = nanoid();
  await db.insert(books)
    .values({
      id,
      userId: auth,
      title: parsed.data.title,
      author: parsed.data.author,
      totalPages: parsed.data.totalPages,
      currentPage: parsed.data.status === "completed" ? parsed.data.totalPages : parsed.data.currentPage,
      status: parsed.data.currentPage >= parsed.data.totalPages ? "completed" : parsed.data.status,
      category: parsed.data.category,
      rating: parsed.data.rating ?? null,
      notes: parsed.data.notes ?? null,
    })
    .run();

  return NextResponse.json({ success: true, id });
}
