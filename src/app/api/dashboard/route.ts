import { readJsonObject } from "@/lib/validation";
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
import { DASHBOARD_WIDGETS, type DashboardWidgetId } from "@/lib/constants";

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(moment().jYear()));
  const month = parseInt(
    searchParams.get("month") ?? String(moment().jMonth() + 1)
  );

  const settings = await getUserSettings(userId);
  const widgets = new Set(settings.widgets as DashboardWidgetId[]);
  const show = (id: DashboardWidgetId) => widgets.has(id);

  const totalBalance = show("balance") ? await getTotalBalance(userId) : 0;
  const monthly = await getMonthlyStats(userId, year, month);
  const recent = show("recent") ? await getRecentTransactions(userId, 8) : [];
  const expenses = show("chart") ? await getExpenseByCategory(userId, year, month) : [];
  const forecast = show("forecast")
    ? await getMonthlyForecast(userId, year, month)
    : null;
  const anomalies = show("anomalies")
    ? await getAnomalies(userId, year, month, settings.anomalyThreshold)
    : [];
  const savingsGoals = show("goals") ? (await getGoals(userId, "savings")).slice(0, 3) : [];
  const purchaseGoals = show("goals")
    ? (await getGoals(userId, "purchase")).slice(0, 3)
    : [];
  const lifeSummary = show("life") ? await getLifeSummary(userId) : null;

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
  widgets: z.array(z.enum(Object.keys(DASHBOARD_WIDGETS) as [DashboardWidgetId, ...DashboardWidgetId[]])).max(Object.keys(DASHBOARD_WIDGETS).length).optional(),
  anomalyThreshold: z.number().min(10).max(200).optional(),
});

export async function PATCH(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await readJsonObject(request);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const updates: Record<string, string | number> = {};
  if (parsed.data.widgets) {
    updates.dashboardWidgets = JSON.stringify(parsed.data.widgets);
  }
  if (parsed.data.anomalyThreshold !== undefined) {
    updates.anomalyThreshold = parsed.data.anomalyThreshold;
  }

  if (Object.keys(updates).length === 0) return NextResponse.json(await getUserSettings(userId));

  await db.update(userSettings)
    .set(updates)
    .where(eq(userSettings.userId, userId))
    .run();

  return NextResponse.json(await getUserSettings(userId));
}
