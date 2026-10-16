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
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string(),
});

export async function GET(request: Request) {
  ensureDb();
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

  const list = db
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
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const id = nanoid();
  let { accountId, categoryId, type, amount, description, date } = parsed.data;

  if (!categoryId && description) {
    const auto = autoCategorize(userId, description, type);
    if (auto) categoryId = auto;
  }

  db.insert(transactions)
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
