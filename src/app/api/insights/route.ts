import { NextResponse } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import moment from "jalali-moment";
import { db } from "@/lib/db";
import {
  dailyJournals,
  habitCompletions,
  habits,
  medicationLogs,
  medications,
  weeklyInsights,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import {
  ensureDb,
  getAnomalies,
  getExpenseByCategory,
  getMonthlyStats,
  getUserSettings,
} from "@/lib/db/queries";
import { generateWeeklyInsight } from "@/lib/ai/gemini";

function weekStartIso() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday start
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const latest = await db
    .select()
    .from(weeklyInsights)
    .where(eq(weeklyInsights.userId, auth))
    .orderBy(desc(weeklyInsights.createdAt))
    .limit(1)
    .get();

  return NextResponse.json({ insight: latest ?? null });
}

export async function POST() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const settings = await getUserSettings(auth);
  const locale = settings.locale === "en" ? "en" : "fa";
  const year = moment().jYear();
  const month = moment().jMonth() + 1;
  const stats = await getMonthlyStats(auth, year, month);
  const categories = await getExpenseByCategory(auth, year, month);
  const anomalies = await getAnomalies(
    auth,
    year,
    month,
    settings.anomalyThreshold ?? 30
  );

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceKey = since.toISOString().slice(0, 10);

  const journals = await db
    .select()
    .from(dailyJournals)
    .where(
      and(eq(dailyJournals.userId, auth), gte(dailyJournals.date, sinceKey))
    )
    .all();
  const moodCounts: Record<string, number> = {};
  for (const j of journals) {
    moodCounts[j.mood] = (moodCounts[j.mood] ?? 0) + 1;
  }

  const habitList = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, auth), eq(habits.active, true)))
    .all();
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = await db
    .select()
    .from(habitCompletions)
    .where(
      and(eq(habitCompletions.userId, auth), eq(habitCompletions.date, today))
    )
    .all();

  const activeMeds = await db
    .select()
    .from(medications)
    .where(and(eq(medications.userId, auth), eq(medications.active, true)))
    .all();
  const logsToday = await db
    .select()
    .from(medicationLogs)
    .where(
      and(eq(medicationLogs.userId, auth), eq(medicationLogs.date, today))
    )
    .all();
  const taken = new Set(logsToday.map((l) => l.medicationId));
  const medsMissed = activeMeds.filter((m) => !taken.has(m.id)).length;

  const result = await generateWeeklyInsight({
    locale,
    income: stats.income,
    expense: stats.expense,
    topCategories: categories
      .filter((c) => c.categoryName)
      .map((c) => ({ name: c.categoryName!, total: c.total })),
    anomalies: anomalies.map((a) => ({
      name: a.categoryName,
      percentAbove: a.percentAbove,
    })),
    moodCounts,
    habitsDone: doneToday.length,
    habitsTotal: habitList.length,
    medsMissed,
  });

  const weekStart = weekStartIso();
  const id = nanoid();
  const suggestionsJson = JSON.stringify({
    budgetTips: result.budgetTips,
    goalTips: result.goalTips,
    source: result.source,
  });

  await db
    .insert(weeklyInsights)
    .values({
      id,
      userId: auth,
      weekStart,
      locale,
      content: result.summary,
      suggestionsJson,
    })
    .run();

  return NextResponse.json({
    insight: {
      id,
      weekStart,
      locale,
      content: result.summary,
      suggestionsJson,
      source: result.source,
    },
  });
}
