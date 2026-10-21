import { dateInput } from "@/lib/validation";
import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { meals, waterLogs } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { eq, and, desc } from "drizzle-orm";
import { getUserSettings } from "@/lib/db/queries";

const addMealSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  date: dateInput,
  name: z.string().min(1, "نام غذا الزامی است"),
  calories: z.number().nonnegative().default(0),
  protein: z.number().nonnegative().default(0),
  carbs: z.number().nonnegative().default(0),
  fat: z.number().nonnegative().default(0),
  note: z.string().optional().nullable(),
});

const logWaterSchema = z.object({
  date: dateInput,
  amountMl: z.number().positive(),
});

export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const userMeals = await db
    .select()
    .from(meals)
    .where(and(eq(meals.userId, auth), eq(meals.date, date)))
    .all();

  const userWater = await db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, auth), eq(waterLogs.date, date)))
    .all();

  const totalWater = userWater.reduce((sum, item) => sum + item.amountMl, 0);
  const totalCalories = userMeals.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = userMeals.reduce((sum, item) => sum + item.protein, 0);
  const totalCarbs = userMeals.reduce((sum, item) => sum + item.carbs, 0);
  const totalFat = userMeals.reduce((sum, item) => sum + item.fat, 0);

  const settings = await getUserSettings(auth);
  const targets = settings.healthTargets;

  const recentFoods = await db.select({ name: meals.name, calories: meals.calories, protein: meals.protein, carbs: meals.carbs, fat: meals.fat }).from(meals).where(eq(meals.userId, auth)).orderBy(desc(meals.createdAt)).limit(100).all();

  const calPct = Math.round((totalCalories / Math.max(1, targets.calories)) * 100);
  let nextAction = "log_meal";
  if (userMeals.length === 0) nextAction = "log_meal";
  else if (totalWater < targets.waterMl * 0.5) nextAction = "drink_water";
  else if (calPct >= 100) nextAction = "on_target";
  else if (totalProtein < targets.protein * 0.6) nextAction = "add_protein";
  else nextAction = "keep_logging";

  return NextResponse.json({
    date,
    meals: userMeals,
    recentFoods,
    waterLogs: userWater,
    targets,
    summary: {
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalWater,
      targetCalories: targets.calories,
      targetProtein: targets.protein,
      targetCarbs: targets.carbs,
      targetFat: targets.fat,
      targetWater: targets.waterMl,
    },
    stats: {
      calPct,
      nextAction,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);

  if (body.type === "water") {
    const parsed = logWaterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات آب نامعتبر است" }, { status: 400 });
    }
    const id = nanoid();
    await db.insert(waterLogs)
      .values({
        id,
        userId: auth,
        date: parsed.data.date,
        amountMl: parsed.data.amountMl,
      })
      .run();
    return NextResponse.json({ success: true, id });
  }

  const parsed = addMealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات غذا نامعتبر است" }, { status: 400 });
  }

  const id = nanoid();
  await db.insert(meals)
    .values({
      id,
      userId: auth,
      mealType: parsed.data.mealType,
      date: parsed.data.date,
      name: parsed.data.name,
      calories: parsed.data.calories,
      protein: parsed.data.protein,
      carbs: parsed.data.carbs,
      fat: parsed.data.fat,
      note: parsed.data.note ?? null,
    })
    .run();

  return NextResponse.json({ success: true, id });
}
