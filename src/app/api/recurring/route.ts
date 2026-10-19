import { readJsonObject } from "@/lib/validation";
import { validateFinancialReferences } from "@/lib/financial-validation";
import { dateInput, moneyInput } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import {
  ensureDb,
  db,
  recurringTransactions,
  accounts,
  categories,
  processDueRecurring,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";

const schema = z.object({
  accountId: z.string(),
  categoryId: z.string().optional().nullable(),
  type: z.enum(["income", "expense"]),
  amount: moneyInput,
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  nextRunDate: dateInput,
});

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  await processDueRecurring(userId);

  const list = await db
    .select({
      id: recurringTransactions.id,
      type: recurringTransactions.type,
      amount: recurringTransactions.amount,
      description: recurringTransactions.description,
      frequency: recurringTransactions.frequency,
      nextRunDate: recurringTransactions.nextRunDate,
      isActive: recurringTransactions.isActive,
      accountName: accounts.name,
      categoryName: categories.name,
    })
    .from(recurringTransactions)
    .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
    .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
    .where(eq(recurringTransactions.userId, userId))
    .orderBy(desc(recurringTransactions.createdAt))
    .all();

  return NextResponse.json(list);
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await readJsonObject(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const id = nanoid();
  const { accountId, categoryId, type, amount, description, frequency, nextRunDate } =
    parsed.data;

  const referenceError = await validateFinancialReferences(userId, { accountId, categoryId, type });
  if (referenceError) return referenceError;

  await db.insert(recurringTransactions)
    .values({
      id,
      userId,
      accountId,
      categoryId: categoryId ?? null,
      type,
      amount,
      description,
      frequency,
      nextRunDate: new Date(nextRunDate),
    })
    .run();

  return NextResponse.json({ id });
}
