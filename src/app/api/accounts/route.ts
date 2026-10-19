import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  ensureDb,
  db,
  accounts,
  getAccountBalance,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["cash", "bank", "card", "wallet"]),
  color: z.string().optional(),
  initialBalance: z.number().optional(),
});

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const list = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .all();

  const withBalance = await Promise.all(list.map(async (acc) => ({
    ...acc,
    balance: await getAccountBalance(acc.id),
  })));

  return NextResponse.json(withBalance);
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await readJsonObject(request);
  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const id = nanoid();
  const { name, type, color, initialBalance } = parsed.data;

  await db.insert(accounts)
    .values({
      id,
      userId,
      name,
      type,
      color: color ?? "#3b82f6",
      initialBalance: initialBalance ?? 0,
    })
    .run();

  const account = await db.select().from(accounts).where(eq(accounts.id, id)).get();
  return NextResponse.json({ ...account, balance: await getAccountBalance(id) });
}
