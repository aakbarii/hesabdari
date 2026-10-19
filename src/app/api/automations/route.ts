import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import moment from "jalali-moment";
import { db } from "@/lib/db";
import {
  cycleEntries,
  cycleSettings,
  habitCompletions,
  habits,
  medicationLogs,
  medications,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import {
  ensureDb,
  getAnomalies,
  getDebtSettlementSuggestions,
  getUserSettings,
  suggestBudgetsFromAvg,
  applyBudgetSuggestions,
  completeRoutinesBySlot,
  syncAssetRates,
} from "@/lib/db/queries";
import { readJsonObject } from "@/lib/validation";

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const settings = await getUserSettings(auth);
  const year = moment().jYear();
  const month = moment().jMonth() + 1;

  const [anomalies, debts, budgetSuggestions] = await Promise.all([
    getAnomalies(auth, year, month, settings.anomalyThreshold ?? 30),
    getDebtSettlementSuggestions(auth),
    suggestBudgetsFromAvg(auth, year, month),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const activeMeds = await db
    .select()
    .from(medications)
    .where(and(eq(medications.userId, auth), eq(medications.active, true)))
    .all();
  const logsToday = await db
    .select()
    .from(medicationLogs)
    .where(and(eq(medicationLogs.userId, auth), eq(medicationLogs.date, today)))
    .all();
  const taken = new Set(logsToday.filter((l) => l.taken).map((l) => l.medicationId));
  const missedMeds = activeMeds
    .filter((m) => m.schedule !== "as_needed" && !taken.has(m.id))
    .map((m) => ({ id: m.id, name: m.name }));

  const habitList = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, auth), eq(habits.active, true)))
    .all();
  const done = await db
    .select()
    .from(habitCompletions)
    .where(and(eq(habitCompletions.userId, auth), eq(habitCompletions.date, today)))
    .all();
  const doneIds = new Set(done.map((d) => d.habitId));
  const missedHabits = habitList
    .filter((h) => !doneIds.has(h.id))
    .map((h) => ({ id: h.id, title: h.title }));

  // Period-near sleep tip
  let cycleSleepTip: string | null = null;
  const cSettings = await db
    .select()
    .from(cycleSettings)
    .where(eq(cycleSettings.userId, auth))
    .get();
  const starts = (
    await db
      .select()
      .from(cycleEntries)
      .where(
        and(eq(cycleEntries.userId, auth), eq(cycleEntries.kind, "period_start"))
      )
      .all()
  )
    .map((e) => e.date)
    .sort()
    .reverse();
  if (starts[0] && cSettings) {
    const last = new Date(starts[0] + "T12:00:00");
    const next = new Date(last);
    next.setDate(next.getDate() + cSettings.avgCycleLength);
    const days = Math.ceil((next.getTime() - Date.now()) / 86400000);
    if (days >= 0 && days <= 5) {
      cycleSleepTip =
        settings.locale === "en"
          ? `Period likely in ${days} day(s) — prioritize sleep and lower intensity workouts.`
          : `احتمالاً تا ${days} روز دیگر پریود — خواب بیشتر و ورزش سبک‌تر پیشنهاد می‌شود.`;
    }
  }

  return NextResponse.json({
    anomalies,
    debtSuggestions: debts,
    budgetSuggestions: budgetSuggestions.slice(0, 8),
    missedMeds,
    missedHabits,
    cycleSleepTip,
    geminiEnabled: Boolean(process.env.GEMINI_API_KEY),
  });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const body = await readJsonObject(request);
  const action = String(body.action ?? "");

  if (action === "apply-budgets") {
    const year = Number(body.year) || moment().jYear();
    const month = Number(body.month) || moment().jMonth() + 1;
    const result = await applyBudgetSuggestions(auth, year, month);
    return NextResponse.json(result);
  }

  if (action === "sync-assets") {
    return NextResponse.json(await syncAssetRates(auth));
  }

  if (action === "complete-routines") {
    const slot = body.slot === "night" ? "night" : "morning";
    return NextResponse.json(await completeRoutinesBySlot(auth, slot));
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
