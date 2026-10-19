import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  ensureDb,
  db,
  categories,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["income", "expense"]),
  color: z.string().optional(),
});

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const query = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId));

  const list = query;
  const filtered =
    type === "income" || type === "expense"
      ? list.filter((c) => c.type === type)
      : list;

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await readJsonObject(request);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const id = nanoid();
  const { name, type, color } = parsed.data;

  await db.insert(categories)
    .values({
      id,
      userId,
      name,
      type,
      color: color ?? "#6b7280",
    })
    .run();

  return NextResponse.json({ id });
}
