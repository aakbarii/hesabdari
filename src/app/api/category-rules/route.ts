import { readJsonObject } from "@/lib/validation";
import { validateFinancialReferences } from "@/lib/financial-validation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb, db, categoryRules, categories } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";

const ruleSchema = z.object({
  keyword: z.string().min(1),
  categoryId: z.string(),
});

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const list = await db
    .select({
      id: categoryRules.id,
      keyword: categoryRules.keyword,
      categoryId: categoryRules.categoryId,
      categoryName: categories.name,
    })
    .from(categoryRules)
    .innerJoin(categories, eq(categoryRules.categoryId, categories.id))
    .where(eq(categoryRules.userId, userId))
    .all();

  return NextResponse.json(list);
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await readJsonObject(request);
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const referenceError = await validateFinancialReferences(userId, { categoryId: parsed.data.categoryId });
  if (referenceError) return referenceError;

  const id = nanoid();
  await db.insert(categoryRules)
    .values({
      id,
      userId,
      keyword: parsed.data.keyword,
      categoryId: parsed.data.categoryId,
    })
    .run();

  return NextResponse.json({ id });
}
