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
  return NextResponse.json({ year, month, budgets: items });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);
  const parsed = budgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const { categoryId, year, month, amount } = parsed.data;

  const referenceError = await validateFinancialReferences(auth, { categoryId, type: "expense" });
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
    await db.update(budgets)
      .set({ amount })
      .where(eq(budgets.id, existing.id))
      .run();
    return NextResponse.json({ id: existing.id });
  }

  const id = nanoid();
  await db.insert(budgets)
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
