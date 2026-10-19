import { readJsonObject } from "@/lib/validation";
import { validateFinancialReferences } from "@/lib/financial-validation";
import { dateInput, moneyInput } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import {
  ensureDb,
  db,
  transactions,
  accounts,
  categories,
  autoCategorize,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { z } from "zod";

const transactionSchema = z.object({
  accountId: z.string(),
  categoryId: z.string().optional().nullable(),
  type: z.enum(["income", "expense"]),
  amount: moneyInput,
  description: z.string().optional(),
  date: dateInput,
});

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q");
  const accountId = searchParams.get("accountId");
  const categoryId = searchParams.get("categoryId");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if ((minAmount && !moneyInput.or(z.literal(0)).safeParse(Number(minAmount)).success) ||
      (maxAmount && !moneyInput.or(z.literal(0)).safeParse(Number(maxAmount)).success) ||
      (fromDate && !dateInput.safeParse(fromDate).success) ||
      (toDate && !dateInput.safeParse(toDate).success) ||
      (minAmount && maxAmount && Number(minAmount) > Number(maxAmount))) {
    return NextResponse.json({ error: "فیلترهای مبلغ یا تاریخ نامعتبر است" }, { status: 400 });
  }

  const conditions = [eq(transactions.userId, userId)];
  if (type === "income" || type === "expense") {
    conditions.push(eq(transactions.type, type));
  }
  if (accountId) conditions.push(eq(transactions.accountId, accountId));
  if (categoryId) conditions.push(eq(transactions.categoryId, categoryId));
  if (minAmount) conditions.push(gte(transactions.amount, parseInt(minAmount)));
  if (maxAmount) conditions.push(lte(transactions.amount, parseInt(maxAmount)));
  if (fromDate) conditions.push(gte(transactions.date, new Date(fromDate)));
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(transactions.date, end));
  }
  if (q) {
    conditions.push(
      sql`(${transactions.description} LIKE ${"%" + q + "%"} OR ${categories.name} LIKE ${"%" + q + "%"})`
    );
  }

  const list = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      description: transactions.description,
      date: transactions.date,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      receiptPath: transactions.receiptPath,
      accountName: accounts.name,
      accountColor: accounts.color,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date))
    .all();

  return NextResponse.json(list);
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await readJsonObject(request);
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const id = nanoid();
  const { accountId, type, amount, description, date } = parsed.data;
  let { categoryId } = parsed.data;

  if (!categoryId && description) {
    const auto = await autoCategorize(userId, description, type);
    if (auto) categoryId = auto;
  }

  const referenceError = await validateFinancialReferences(userId, { accountId, categoryId, type });
  if (referenceError) return referenceError;

  await db.insert(transactions)
    .values({
      id,
      userId,
      accountId,
      categoryId: categoryId ?? null,
      type,
      amount,
      description,
      date: new Date(date),
    })
    .run();

  return NextResponse.json({ id, categoryId: categoryId ?? null });
}
