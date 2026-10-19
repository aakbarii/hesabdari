import { readJsonObject } from "@/lib/validation";
import { validateFinancialReferences } from "@/lib/financial-validation";
import { dateInput, moneyInput } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import {
  ensureDb,
  db,
  transfers,
  accounts,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { z } from "zod";

const transferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: moneyInput,
  description: z.string().optional(),
  date: dateInput,
});

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const list = await db
    .select({
      id: transfers.id,
      amount: transfers.amount,
      description: transfers.description,
      date: transfers.date,
      fromAccountId: transfers.fromAccountId,
      toAccountId: transfers.toAccountId,
    })
    .from(transfers)
    .where(eq(transfers.userId, userId))
    .orderBy(desc(transfers.date))
    .all();

  const accountsMap = Object.fromEntries(
    (await db.select().from(accounts).where(eq(accounts.userId, userId)).all()).map((a) => [a.id, a])
  );

  const enriched = list.map((t) => ({
    ...t,
    fromAccountName: accountsMap[t.fromAccountId]?.name,
    toAccountName: accountsMap[t.toAccountId]?.name,
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await readJsonObject(request);
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const { fromAccountId, toAccountId, amount, description, date } =
    parsed.data;

  if (fromAccountId === toAccountId) {
    return NextResponse.json(
      { error: "حساب مبدا و مقصد نمی‌توانند یکسان باشند" },
      { status: 400 }
    );
  }

  for (const accountId of [fromAccountId, toAccountId]) {
    const referenceError = await validateFinancialReferences(userId, { accountId });
    if (referenceError) return referenceError;
  }

  const id = nanoid();
  await db.insert(transfers)
    .values({
      id,
      userId,
      fromAccountId,
      toAccountId,
      amount,
      description,
      date: new Date(date),
    })
    .run();

  return NextResponse.json({ id });
}
