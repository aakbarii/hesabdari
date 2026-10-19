import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  categories,
  pendingBankImports,
  transactions,
  userSettings,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import {
  ensureDb,
  autoCategorize,
  getUserSettings,
  learnCategoryRule,
} from "@/lib/db/queries";
import { parseBankSmsWithAi } from "@/lib/ai/gemini";

async function resolveUserFromToken(token: string | null) {
  if (!token) return null;
  const row = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.smsIngestToken, token))
    .get();
  return row?.userId ?? null;
}

const ingestSchema = z.object({
  text: z.string().min(8).max(4000),
  sender: z.string().max(80).optional().nullable(),
  token: z.string().optional(),
});

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select()
    .from(pendingBankImports)
    .where(
      and(
        eq(pendingBankImports.userId, auth),
        eq(pendingBankImports.status, "pending")
      )
    )
    .orderBy(desc(pendingBankImports.createdAt))
    .limit(50)
    .all();

  const settings = await getUserSettings(auth);
  return NextResponse.json({
    items: rows,
    smsIngestToken: settings.smsIngestToken ?? null,
    geminiEnabled: Boolean(process.env.GEMINI_API_KEY),
  });
}

export async function POST(request: Request) {
  await ensureDb();
  const body = await readJsonObject(request);
  const action = typeof body.action === "string" ? body.action : "ingest";

  if (action === "rotate-token") {
    const auth = await requireUserId();
    if (auth instanceof NextResponse) return auth;
    await getUserSettings(auth);
    const token = nanoid(24);
    await db
      .update(userSettings)
      .set({ smsIngestToken: token })
      .where(eq(userSettings.userId, auth))
      .run();
    return NextResponse.json({ token });
  }

  if (action === "confirm") {
    const auth = await requireUserId();
    if (auth instanceof NextResponse) return auth;
    const id = String(body.id ?? "");
    const accountId = String(body.accountId ?? "");
    if (!id || !accountId) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const item = await db
      .select()
      .from(pendingBankImports)
      .where(
        and(
          eq(pendingBankImports.id, id),
          eq(pendingBankImports.userId, auth),
          eq(pendingBankImports.status, "pending")
        )
      )
      .get();
    if (!item || !item.suggestedType || !item.suggestedAmount) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const type = (body.type as "income" | "expense") || item.suggestedType;
    const amount = Number(body.amount) || item.suggestedAmount;
    const description =
      String(body.title ?? item.suggestedTitle ?? "تراکنش بانکی").slice(0, 120);
    const dateStr =
      String(body.date ?? item.suggestedDate ?? new Date().toISOString().slice(0, 10));
    let categoryId =
      (body.categoryId as string | null | undefined) ??
      item.suggestedCategoryId ??
      null;

    if (!categoryId) {
      categoryId = (await autoCategorize(auth, description, type)) ?? null;
    }

    const txId = nanoid();
    await db
      .insert(transactions)
      .values({
        id: txId,
        userId: auth,
        accountId,
        categoryId,
        type,
        amount,
        description,
        date: new Date(dateStr),
      })
      .run();

    await db
      .update(pendingBankImports)
      .set({ status: "confirmed" })
      .where(eq(pendingBankImports.id, id))
      .run();

    if (categoryId && description) {
      try {
        await learnCategoryRule(auth, description, categoryId);
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json({ success: true, transactionId: txId });
  }

  if (action === "reject") {
    const auth = await requireUserId();
    if (auth instanceof NextResponse) return auth;
    const id = String(body.id ?? "");
    await db
      .update(pendingBankImports)
      .set({ status: "rejected" })
      .where(
        and(eq(pendingBankImports.id, id), eq(pendingBankImports.userId, auth))
      )
      .run();
    return NextResponse.json({ success: true });
  }

  // ingest
  const parsedBody = ingestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  let userId: string | null = null;
  const session = await requireUserId();
  if (!(session instanceof NextResponse)) {
    userId = session;
  } else {
    userId = await resolveUserFromToken(parsedBody.data.token ?? null);
  }
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // de-dupe identical pending raw text
  const existing = await db
    .select()
    .from(pendingBankImports)
    .where(
      and(
        eq(pendingBankImports.userId, userId),
        eq(pendingBankImports.rawText, parsedBody.data.text),
        eq(pendingBankImports.status, "pending")
      )
    )
    .get();
  if (existing) {
    return NextResponse.json({ success: true, id: existing.id, duplicate: true });
  }

  const { parsed, source } = await parseBankSmsWithAi(parsedBody.data.text);

  const userAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .all();
  const defaultAccount = userAccounts[0]?.id ?? null;

  let categoryId: string | null = null;
  try {
    categoryId =
      (await autoCategorize(userId, parsed.title, parsed.type)) ?? null;
  } catch {
    categoryId = null;
  }

  // prefer matching category name if exists
  if (!categoryId) {
    const cats = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .all();
    const hit = cats.find(
      (c) => c.type === parsed.type && parsed.title.includes(c.name)
    );
    categoryId = hit?.id ?? null;
  }

  const id = nanoid();
  await db
    .insert(pendingBankImports)
    .values({
      id,
      userId,
      rawText: parsedBody.data.text,
      sender: parsedBody.data.sender ?? null,
      suggestedType: parsed.type,
      suggestedAmount: parsed.amount,
      suggestedTitle: parsed.title,
      suggestedDate: parsed.date,
      suggestedAccountId: defaultAccount,
      suggestedCategoryId: categoryId,
      confidence: parsed.confidence,
      status: "pending",
      parseSource: source,
    })
    .run();

  return NextResponse.json({
    success: true,
    id,
    suggestion: parsed,
    source,
  });
}
