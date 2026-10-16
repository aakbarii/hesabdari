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
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const list = db
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
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const id = nanoid();
  db.insert(categoryRules)
    .values({
      id,
      userId,
      keyword: parsed.data.keyword,
      categoryId: parsed.data.categoryId,
    })
    .run();

  return NextResponse.json({ id });
}
