import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { focusSessions } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { eq, and, desc } from "drizzle-orm";

const sessionSchema = z.object({
  taskName: z.string().min(1, "نام تسک الزامی است"),
  durationMinutes: z.number().positive().default(25),
  category: z.enum(["work", "study", "coding", "personal"]).default("coding"),
  date: z.string(),
});

export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const sessions = await db
    .select()
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, auth), eq(focusSessions.date, date)))
    .orderBy(desc(focusSessions.createdAt))
    .all();

  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  return NextResponse.json({
    sessions,
    totalMinutes,
    sessionCount: sessions.length,
  });
}

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }

  const id = nanoid();
  await db.insert(focusSessions)
    .values({
      id,
      userId: auth,
      taskName: parsed.data.taskName,
      durationMinutes: parsed.data.durationMinutes,
      category: parsed.data.category,
      date: parsed.data.date,
    })
    .run();

  return NextResponse.json({ success: true, id });
}
