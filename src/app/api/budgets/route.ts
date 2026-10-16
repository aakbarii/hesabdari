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
  year: z.number(),
  month: z.number().min(1).max(12),
  amount: z.number().positive(),
});

export async function GET(request: Request) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(moment().jYear()));
  const month = parseInt(
    searchParams.get("month") ?? String(moment().jMonth() + 1)
  );

  const items = getBudgetsWithSpent(auth, year, month);
  return NextResponse.json({ year, month, budgets: items });
}

export async function POST(request: Request) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = budgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const { categoryId, year, month, amount } = parsed.data;

  const existing = db
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
    db.update(budgets)
      .set({ amount })
      .where(eq(budgets.id, existing.id))
      .run();
    return NextResponse.json({ id: existing.id });
  }

  const id = nanoid();
  db.insert(budgets)
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
