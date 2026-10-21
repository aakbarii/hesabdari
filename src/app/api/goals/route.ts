import { readJsonObject } from "@/lib/validation";
import { validateFinancialReferences } from "@/lib/financial-validation";
import { dateInput, moneyInput } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  ensureDb,
  db,
  goals,
  goalContributions,
  getGoals,
  transactions,
  categories,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";

const goalSchema = z.object({
  type: z.enum(["savings", "purchase"]),
  name: z.string().min(1),
  targetAmount: moneyInput,
  accountId: z.string().optional().nullable(),
  deadline: dateInput.optional().nullable(),
  color: z.string().optional(),
  priority: z.number().optional(),
});

const contributeSchema = z.object({
  goalId: z.string(),
  amount: moneyInput,
  date: dateInput,
  note: z.string().optional(),
  accountId: z.string().optional().nullable(),
  createTransaction: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as "savings" | "purchase" | null;
  const list = await getGoals(
    userId,
    type === "savings" || type === "purchase" ? type : undefined
  );
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await readJsonObject(request);

  if (body.goalId) {
    const parsed = contributeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }
    const { goalId, amount, date, note, accountId, createTransaction } = parsed.data;
    const goal = await db.select().from(goals).where(eq(goals.id, goalId)).get();
    if (!goal || goal.userId !== userId) {
      return NextResponse.json({ error: "هدف یافت نشد" }, { status: 404 });
    }

    const acct = accountId ?? goal.accountId ?? null;
    if (createTransaction && !acct) {
      return NextResponse.json(
        { error: "برای ساخت تراکنش، حساب را انتخاب کنید" },
        { status: 400 }
      );
    }
    const referenceError = await validateFinancialReferences(userId, { accountId: acct });
    if (referenceError) return referenceError;

    const id = nanoid();
    let transactionId: string | null = null;

    await db.transaction(async (tx) => {
      await tx
        .insert(goalContributions)
        .values({ id, goalId, amount, date: new Date(date), note })
        .run();

      const newAmount = goal.currentAmount + amount;
      const status = newAmount >= goal.targetAmount ? "completed" : "active";
      await tx
        .update(goals)
        .set({ currentAmount: newAmount, status })
        .where(eq(goals.id, goalId))
        .run();

      if (createTransaction && acct) {
        const cat = await tx
          .select()
          .from(categories)
          .where(and(eq(categories.userId, userId), eq(categories.type, "expense")))
          .get();
        transactionId = nanoid();
        await tx
          .insert(transactions)
          .values({
            id: transactionId,
            userId,
            accountId: acct,
            categoryId: cat?.id ?? null,
            type: "expense",
            amount,
            description: note || `واریز به هدف «${goal.name}»`,
            date: new Date(date),
          })
          .run();
      }
    });

    return NextResponse.json({ id, transactionId });
  }

  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const id = nanoid();
  const { type, name, targetAmount, accountId, deadline, color, priority } =
    parsed.data;

  const referenceError = await validateFinancialReferences(userId, { accountId });
  if (referenceError) return referenceError;

  await db
    .insert(goals)
    .values({
      id,
      userId,
      type,
      name,
      targetAmount,
      accountId: accountId ?? null,
      deadline: deadline ? new Date(deadline) : null,
      color: color ?? (type === "savings" ? "#10b981" : "#3b82f6"),
      priority: priority ?? 0,
    })
    .run();

  return NextResponse.json({ id });
}
