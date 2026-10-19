import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureDb,
  getUserSettings,
  updateUserCurrency,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { isCurrencyUnit } from "@/lib/currency";

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const settings = await getUserSettings(userId);
  return NextResponse.json({
    currencyUnit: settings.currencyUnit,
    widgets: settings.widgets,
    anomalyThreshold: settings.anomalyThreshold,
  });
}

const patchSchema = z.object({
  currencyUnit: z.enum(["toman", "rial"]).optional(),
});

export async function PATCH(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await readJsonObject(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  if (parsed.data.currencyUnit && isCurrencyUnit(parsed.data.currencyUnit)) {
    const settings = await updateUserCurrency(
      userId,
      parsed.data.currencyUnit
    );
    return NextResponse.json({
      currencyUnit: settings.currencyUnit,
      widgets: settings.widgets,
      anomalyThreshold: settings.anomalyThreshold,
    });
  }

  return NextResponse.json({ error: "تغییری ارسال نشد" }, { status: 400 });
}
