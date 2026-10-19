import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, accounts, categories } from "@/lib/db/queries";

export async function validateFinancialReferences(
  userId: string,
  input: { accountId?: string | null; categoryId?: string | null; type?: "income" | "expense" },
) {
  if (input.accountId != null) {
    const account = await db.select().from(accounts).where(and(eq(accounts.id, input.accountId), eq(accounts.userId, userId))).get();
    if (!account) return NextResponse.json({ error: "حساب انتخاب‌شده یافت نشد" }, { status: 400 });
  }
  if (input.categoryId != null) {
    const category = await db.select().from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId))).get();
    if (!category || (input.type && category.type !== input.type)) {
      return NextResponse.json({ error: "دسته‌بندی با نوع تراکنش مطابقت ندارد" }, { status: 400 });
    }
  }
  return null;
}
