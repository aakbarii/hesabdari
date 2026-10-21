import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq, getTableColumns, type AnyColumn, type Table } from "drizzle-orm";
import { db } from "@/lib/db";
import * as tables from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { ensureDb } from "@/lib/db/queries";
import { RESOURCES, validateRecordPatch } from "@/lib/workbench";
import { readJsonObject } from "@/lib/validation";
function version(row: Record<string, unknown>) { return createHash("sha256").update(JSON.stringify(row)).digest("hex"); }
function resourceFor(key: string) {
  if (!Object.hasOwn(RESOURCES, key) || !Object.hasOwn(tables, key)) return null;
  const table = tables[key as keyof typeof tables] as Table;
  const columns = getTableColumns(table) as Record<string, AnyColumn>;
  if (!columns.id || !columns.userId) return null;
  return { table, columns, config: RESOURCES[key] };
}
export async function GET(request: Request) {
  await ensureDb();
  const userId = await requireUserId(); if (userId instanceof NextResponse) return userId;
  const key = new URL(request.url).searchParams.get("resource") ?? "";
  const resource = resourceFor(key); if (!resource) return NextResponse.json({ error: "بخش یافت نشد" }, { status: 404 });
  const { table, columns } = resource;
  const rows = await db.select().from(table).where(eq(columns.userId, userId)).orderBy(desc(columns.date ?? columns.createdAt ?? columns.id)).limit(501).all();
  return NextResponse.json({ records: rows.slice(0, 500).map(row => ({ ...row, _version: version(row) })), truncated: rows.length > 500 }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function PATCH(request: Request) {
  await ensureDb();
  const userId = await requireUserId(); if (userId instanceof NextResponse) return userId;
  const body = await readJsonObject(request);
  if (typeof body.resource !== "string" || typeof body.id !== "string") return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
  const resource = resourceFor(body.resource); if (!resource) return NextResponse.json({ error: "بخش یافت نشد" }, { status: 404 });
  const { table, columns } = resource;
  const owner = and(eq(columns.id, body.id), eq(columns.userId, userId));
  const existing = await db.select().from(table).where(owner).get();
  if (!existing) return NextResponse.json({ error: "رکورد یافت نشد" }, { status: 404 });
  if (body.version !== version(existing)) return NextResponse.json({ error: "این رکورد تغییر کرده؛ سوابق را تازه کن و دوباره ویرایش کن" }, { status: 409 });
  try {
    const updates = validateRecordPatch(body.resource, body.values, existing);
    if (["dailyJournals", "sleepLogs"].includes(body.resource) && updates.date && updates.date !== existing.date) {
      const conflict = await db.select().from(table).where(and(eq(columns.userId, userId), eq(columns.date, updates.date))).get();
      if (conflict) return NextResponse.json({ error: "برای این روز قبلاً رکوردی ثبت شده است" }, { status: 409 });
    }
    await db.update(table).set(updates).where(owner).run();
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error && !("issues" in error) ? error.message : "مقادیر واردشده معتبر نیستند" }, { status: 400 }); }
}
