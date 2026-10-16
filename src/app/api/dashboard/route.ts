import { NextResponse } from "next/server";
import moment from "jalali-moment";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  ensureDb,
  db,
  userSettings,
  getUserSettings,
  getMonthlyForecast,
  getAnomalies,
  getGoals,
  getLifeSummary,
  getTotalBalance,
  getMonthlyStats,
  getRecentTransactions,
  getExpenseByCategory,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import type { DashboardWidgetId } from "@/lib/constants";

export async function GET(request: Request) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(moment().jYear()));
  const month = parseInt(
    searchParams.get("month") ?? String(moment().jMonth() + 1)
  );

  const settings = getUserSettings(userId);
  const widgets = new Set(settings.widgets as DashboardWidgetId[]);
  const show = (id: DashboardWidgetId) => widgets.has(id);

  const totalBalance = show("balance") ? getTotalBalance(userId) : 0;
  const monthly = show("monthly") || show("forecast")
    ? getMonthlyStats(userId, year, month)
    : { income: 0, expense: 0, balance: 0 };
  const recent = show("recent") ? getRecentTransactions(userId, 8) : [];
  const expenses = show("chart") ? getExpenseByCategory(userId, year, month) : [];
  const forecast = show("forecast")
    ? getMonthlyForecast(userId, year, month)
    : null;
  const anomalies = show("anomalies")
    ? getAnomalies(userId, year, month, settings.anomalyThreshold)
    : [];
  const savingsGoals = show("goals") ? getGoals(userId, "savings").slice(0, 3) : [];
  const purchaseGoals = show("goals")
    ? getGoals(userId, "purchase").slice(0, 3)
    : [];
  const lifeSummary = show("life") ? getLifeSummary(userId) : null;

  return NextResponse.json({
    totalBalance,
    monthly,
    recent,
    expenses,
    forecast,
    anomalies,
    savingsGoals,
    purchaseGoals,
    lifeSummary,
    widgets: settings.widgets,
    year,
    month,
  });
}

const settingsSchema = z.object({
  widgets: z.array(z.string()).optional(),
  anomalyThreshold: z.number().min(10).max(200).optional(),
});

export async function PATCH(request: Request) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const updates: Record<string, string | number> = {};
  if (parsed.data.widgets) {
    updates.dashboardWidgets = JSON.stringify(parsed.data.widgets);
  }
  if (parsed.data.anomalyThreshold !== undefined) {
    updates.anomalyThreshold = parsed.data.anomalyThreshold;
  }

  db.update(userSettings)
    .set(updates)
    .where(eq(userSettings.userId, userId))
    .run();

  return NextResponse.json(getUserSettings(userId));
}
