import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb, db, assets, getAssetPriceHistory } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["gold", "stock", "crypto", "property", "currency", "other"]),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  purchasePrice: z.number().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  notes: z.string().optional(),
  color: z.string().optional(),
});

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const list = (await db
    .select()
    .from(assets)
    .where(eq(assets.userId, userId))
    .all())
    .map((a) => ({
      ...a,
      totalValue: a.quantity * a.unitPrice,
      profit:
        a.purchasePrice != null
          ? a.quantity * a.unitPrice - a.purchasePrice
          : null,
    }));

  const totalValue = list.reduce((s, a) => s + a.totalValue, 0);
  const priceHistory = await getAssetPriceHistory(userId, undefined, 40);
  return NextResponse.json({ assets: list, totalValue, priceHistory });
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
  const { name, type, quantity, unitPrice, purchasePrice, purchaseDate, notes, color } =
    parsed.data;

  await db.insert(assets)
    .values({
      id,
      userId,
      name,
      type,
      quantity,
      unitPrice,
      purchasePrice: purchasePrice ?? null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      notes,
      color: color ?? "#f59e0b",
    })
    .run();

  return NextResponse.json({ id });
}
