import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { workouts, bodyMetrics } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { eq, desc } from "drizzle-orm";

const workoutSchema = z.object({
  title: z.string().min(1, "عنوان تمرین الزامی است"),
  type: z.enum(["strength", "cardio", "walk", "flexibility", "other"]),
  durationMinutes: z.number().positive(),
  caloriesBurned: z.number().nonnegative().default(0),
  date: z.string(),
  notes: z.string().optional().nullable(),
});

const metricSchema = z.object({
  weightKg: z.number().positive(),
  bodyFat: z.number().optional().nullable(),
  date: z.string(),
  note: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const userWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, auth))
    .orderBy(desc(workouts.date), desc(workouts.createdAt))
    .limit(30)
    .all();

  const userMetrics = await db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, auth))
    .orderBy(desc(bodyMetrics.date))
    .limit(30)
    .all();

  return NextResponse.json({
    workouts: userWorkouts,
    metrics: userMetrics,
  });
}

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);

  if (body.kind === "metric") {
    const parsed = metricSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات وزن نامعتبر است" }, { status: 400 });
    }
    const id = nanoid();
    await db.insert(bodyMetrics)
      .values({
        id,
        userId: auth,
        date: parsed.data.date,
        weightKg: parsed.data.weightKg,
        bodyFat: parsed.data.bodyFat ?? null,
        note: parsed.data.note ?? null,
      })
      .run();
    return NextResponse.json({ success: true, id });
  }

  const parsed = workoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات تمرین نامعتبر است" }, { status: 400 });
  }

  const id = nanoid();
  await db.insert(workouts)
    .values({
      id,
      userId: auth,
      title: parsed.data.title,
      type: parsed.data.type,
      durationMinutes: parsed.data.durationMinutes,
      caloriesBurned: parsed.data.caloriesBurned,
      date: parsed.data.date,
      notes: parsed.data.notes ?? null,
    })
    .run();

  return NextResponse.json({ success: true, id });
}
