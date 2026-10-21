import { dateInput } from "@/lib/validation";
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
  date: dateInput,
  notes: z.string().optional().nullable(),
});

const metricSchema = z.object({
  weightKg: z.number().positive(),
  bodyFat: z.number().optional().nullable(),
  date: dateInput,
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
    .limit(60)
    .all();

  const userMetrics = await db
    .select()
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, auth))
    .orderBy(desc(bodyMetrics.date))
    .limit(60)
    .all();

  const days7: string[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    days7.push(x.toISOString().slice(0, 10));
  }
  const today = days7[6];
  const weekWorkouts = userWorkouts.filter((w) => days7.includes(w.date));
  const weekMinutes = weekWorkouts.reduce((s, w) => s + w.durationMinutes, 0);
  const weekCalories = weekWorkouts.reduce((s, w) => s + w.caloriesBurned, 0);
  const todayWorkouts = userWorkouts.filter((w) => w.date === today);

  const durationTrend = days7.map((date) => ({
    date,
    label: date.slice(5),
    value: userWorkouts
      .filter((w) => w.date === date)
      .reduce((s, w) => s + w.durationMinutes, 0),
  }));

  const weightTrend = [...userMetrics]
    .reverse()
    .slice(-14)
    .map((m) => ({
      date: m.date,
      label: m.date.slice(5),
      value: m.weightKg,
    }));

  return NextResponse.json({
    workouts: userWorkouts.slice(0, 30),
    metrics: userMetrics.slice(0, 30),
    templates: [
      { title: "قدرتی فول‌بادی", type: "strength", durationMinutes: 45, caloriesBurned: 280 },
      { title: "دویدن سبک", type: "cardio", durationMinutes: 30, caloriesBurned: 250 },
      { title: "پیاده‌روی عصر", type: "walk", durationMinutes: 40, caloriesBurned: 180 },
      { title: "یوگا و کشش", type: "flexibility", durationMinutes: 25, caloriesBurned: 90 },
    ],
    stats: {
      weekMinutes,
      weekCalories,
      weekSessions: weekWorkouts.length,
      todaySessions: todayWorkouts.length,
      durationTrend,
      weightTrend,
      nextAction: todayWorkouts.length
        ? "log_weight_or_rest"
        : weekMinutes < 90
          ? "start_session"
          : "optional_session",
    },
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
