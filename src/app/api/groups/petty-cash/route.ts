import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import moment from "jalali-moment";
import { db } from "@/lib/db";
import {
  groupMembers,
  groupPettyCash,
  groupPettyCashItems,
  groups,
  receiptFiles,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { ensureDb } from "@/lib/db/queries";

async function memberOf(groupId: string, userId: string) {
  return db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .get();
}

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const groupId = new URL(request.url).searchParams.get("groupId");
  if (!groupId || !(await memberOf(groupId, auth))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const year = Number(new URL(request.url).searchParams.get("year")) || moment().jYear();
  const month =
    Number(new URL(request.url).searchParams.get("month")) ||
    moment().jMonth() + 1;

  let fund = await db
    .select()
    .from(groupPettyCash)
    .where(
      and(
        eq(groupPettyCash.groupId, groupId),
        eq(groupPettyCash.year, year),
        eq(groupPettyCash.month, month)
      )
    )
    .get();

  const items = fund
    ? await db
        .select()
        .from(groupPettyCashItems)
        .where(eq(groupPettyCashItems.pettyCashId, fund.id))
        .orderBy(desc(groupPettyCashItems.createdAt))
        .all()
    : [];

  const spent = items.reduce((s, i) => s + i.amount, 0);

  return NextResponse.json({
    fund: fund ?? null,
    items,
    spent,
    remaining: fund ? fund.monthlyBudget - spent : 0,
    year,
    month,
  });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const itemId = String(form.get("itemId") ?? "");
    const file = form.get("file");
    if (!itemId || !(file instanceof File)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const item = await db
      .select()
      .from(groupPettyCashItems)
      .where(eq(groupPettyCashItems.id, itemId))
      .get();
    if (!item || !(await memberOf(item.groupId, auth))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 5_000_000) {
      return NextResponse.json({ error: "file too large" }, { status: 400 });
    }
    const receiptId = nanoid();
    await db
      .insert(receiptFiles)
      .values({
        id: receiptId,
        userId: auth,
        mimeType: file.type || "application/octet-stream",
        data: buf,
      })
      .run();
    const path = receiptId;
    await db
      .update(groupPettyCashItems)
      .set({ receiptPath: path })
      .where(eq(groupPettyCashItems.id, itemId))
      .run();
    return NextResponse.json({ success: true, receiptPath: path });
  }

  const body = await readJsonObject(request);
  const action = String(body.action ?? "create-fund");
  const groupId = String(body.groupId ?? "");
  if (!groupId || !(await memberOf(groupId, auth))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (action === "create-fund") {
    const parsed = z
      .object({
        monthlyBudget: z.number().int().min(0),
        year: z.number().int().optional(),
        month: z.number().int().min(1).max(12).optional(),
        title: z.string().optional(),
        managerUserId: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const year = parsed.data.year ?? moment().jYear();
    const month = parsed.data.month ?? moment().jMonth() + 1;
    const managerUserId = parsed.data.managerUserId ?? auth;

    const existing = await db
      .select()
      .from(groupPettyCash)
      .where(
        and(
          eq(groupPettyCash.groupId, groupId),
          eq(groupPettyCash.year, year),
          eq(groupPettyCash.month, month)
        )
      )
      .get();

    if (existing) {
      await db
        .update(groupPettyCash)
        .set({
          monthlyBudget: parsed.data.monthlyBudget,
          managerUserId,
          title: parsed.data.title ?? existing.title,
        })
        .where(eq(groupPettyCash.id, existing.id))
        .run();
      return NextResponse.json({ id: existing.id });
    }

    const id = nanoid();
    await db
      .insert(groupPettyCash)
      .values({
        id,
        groupId,
        managerUserId,
        year,
        month,
        monthlyBudget: parsed.data.monthlyBudget,
        title: parsed.data.title ?? "تنخواه",
      })
      .run();
    return NextResponse.json({ id });
  }

  if (action === "add-item") {
    const parsed = z
      .object({
        pettyCashId: z.string(),
        title: z.string().min(1),
        amount: z.number().int().min(0),
        date: z.string().min(8),
        notes: z.string().optional().nullable(),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const fund = await db
      .select()
      .from(groupPettyCash)
      .where(eq(groupPettyCash.id, parsed.data.pettyCashId))
      .get();
    if (!fund || fund.groupId !== groupId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const id = nanoid();
    await db
      .insert(groupPettyCashItems)
      .values({
        id,
        pettyCashId: fund.id,
        groupId,
        createdBy: auth,
        title: parsed.data.title,
        amount: parsed.data.amount,
        date: parsed.data.date,
        notes: parsed.data.notes ?? null,
      })
      .run();
    return NextResponse.json({ id });
  }

  // touch groups to avoid unused import lint in some configs
  void groups;
  return NextResponse.json({ error: "unknown" }, { status: 400 });
}
