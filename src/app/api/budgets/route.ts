import { readJsonObject } from "@/lib/validation";
import { validateFinancialReferences } from "@/lib/financial-validation";
import { moneyInput } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import {
  ensureDb,
  db,
  budgets,
  getBudgetsWithSpent,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { z } from "zod";
import moment from "jalali-moment";

const budgetSchema = z.object({
  categoryId: z.string(),
  year: z.number().int().min(1200).max(2000),
  month: z.number().int().min(1).max(12),
  amount: moneyInput,
});

function prevJalaliMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(moment().jYear()));
  const month = parseInt(
    searchParams.get("month") ?? String(moment().jMonth() + 1)
  );

  const items = await getBudgetsWithSpent(auth, year, month);
  const alerts = items
    .filter((b) => b.amount > 0 && b.spent / b.amount >= 0.8)
    .map((b) => {
      const pct = Math.round((b.spent / b.amount) * 100);
      return {
        id: b.id,
        categoryName: b.categoryName,
        percent: pct,
        level: b.spent >= b.amount ? "exceeded" : "warning",
        spent: b.spent,
        amount: b.amount,
      };
    });

  // 3-month trend (current + 2 previous)
  const months: { year: number; month: number; totalBudget: number; totalSpent: number }[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < 3; i++) {
    const list = await getBudgetsWithSpent(auth, y, m);
    months.unshift({
      year: y,
      month: m,
      totalBudget: list.reduce((s, b) => s + b.amount, 0),
      totalSpent: list.reduce((s, b) => s + b.spent, 0),
    });
    const prev = prevJalaliMonth(y, m);
    y = prev.year;
    m = prev.month;
  }

  return NextResponse.json({
    year,
    month,
    budgets: items,
    alerts,
    trend3m: months,
  });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);

  if (body.action === "rollover") {
    const year = Number(body.year) || moment().jYear();
    const month = Number(body.month) || moment().jMonth() + 1;
    const prev = prevJalaliMonth(year, month);
    const prevItems = await getBudgetsWithSpent(auth, prev.year, prev.month);
    let created = 0;
    for (const b of prevItems) {
      const leftover = Math.max(0, b.amount - b.spent);
      if (leftover <= 0) continue;
      const existing = await db
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.userId, auth),
            eq(budgets.categoryId, b.categoryId),
            eq(budgets.year, year),
            eq(budgets.month, month)
          )
        )
        .get();
      if (existing) {
        await db
          .update(budgets)
          .set({ amount: existing.amount + leftover })
          .where(eq(budgets.id, existing.id))
          .run();
      } else {
        await db
          .insert(budgets)
          .values({
            id: nanoid(),
            userId: auth,
            categoryId: b.categoryId,
            year,
            month,
            amount: leftover,
          })
          .run();
      }
      created++;
    }
    return NextResponse.json({ rolled: created });
  }

  const parsed = budgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const { categoryId, year, month, amount } = parsed.data;

  const referenceError = await validateFinancialReferences(auth, {
    categoryId,
    type: "expense",
  });
  if (referenceError) return referenceError;

  const existing = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, auth),
        eq(budgets.categoryId, categoryId),
        eq(budgets.year, year),
        eq(budgets.month, month)
      )
    )
    .get();

  if (existing) {
    await db
      .update(budgets)
      .set({ amount })
      .where(eq(budgets.id, existing.id))
      .run();
    return NextResponse.json({ id: existing.id });
  }

  const id = nanoid();
  await db
    .insert(budgets)
    .values({
      id,
      userId: auth,
      categoryId,
      year,
      month,
      amount,
    })
    .run();

  return NextResponse.json({ id });
}
