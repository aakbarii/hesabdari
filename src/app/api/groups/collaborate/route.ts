import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groupExpenses,
  groupMembers,
  groupShoppingItems,
  groupTasks,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { ensureDb } from "@/lib/db/queries";

async function assertMember(groupId: string, userId: string) {
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
  if (!groupId) return NextResponse.json({ error: "groupId" }, { status: 400 });
  if (!(await assertMember(groupId, auth))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const shopping = await db
    .select()
    .from(groupShoppingItems)
    .where(eq(groupShoppingItems.groupId, groupId))
    .orderBy(desc(groupShoppingItems.createdAt))
    .all();
  const tasks = await db
    .select()
    .from(groupTasks)
    .where(eq(groupTasks.groupId, groupId))
    .orderBy(desc(groupTasks.createdAt))
    .all();
  const expenses = await db
    .select()
    .from(groupExpenses)
    .where(eq(groupExpenses.groupId, groupId))
    .orderBy(desc(groupExpenses.date))
    .all();

  return NextResponse.json({ shopping, tasks, expenses });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const body = await readJsonObject(request);
  const groupId = String(body.groupId ?? "");
  const kind = String(body.kind ?? "");
  if (!groupId || !(await assertMember(groupId, auth))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (kind === "shopping") {
    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const id = nanoid();
    await db
      .insert(groupShoppingItems)
      .values({
        id,
        groupId,
        createdBy: auth,
        title,
        qty: body.qty ? String(body.qty) : null,
      })
      .run();
    return NextResponse.json({ success: true, id });
  }

  if (kind === "task") {
    const title = String(body.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const id = nanoid();
    await db
      .insert(groupTasks)
      .values({
        id,
        groupId,
        createdBy: auth,
        title,
        assigneeName: body.assigneeName ? String(body.assigneeName) : null,
      })
      .run();
    return NextResponse.json({ success: true, id });
  }

  if (kind === "expense") {
    const parsed = z
      .object({
        title: z.string().min(1),
        amount: z.number().int().min(0),
        category: z.string().default("عمومی"),
        date: z.string().min(8),
      })
      .safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const id = nanoid();
    await db
      .insert(groupExpenses)
      .values({ id, groupId, createdBy: auth, ...parsed.data })
      .run();
    return NextResponse.json({ success: true, id });
  }

  if (kind === "toggle-shopping") {
    const id = String(body.id ?? "");
    const row = await db
      .select()
      .from(groupShoppingItems)
      .where(and(eq(groupShoppingItems.id, id), eq(groupShoppingItems.groupId, groupId)))
      .get();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    await db
      .update(groupShoppingItems)
      .set({ done: !row.done })
      .where(eq(groupShoppingItems.id, id))
      .run();
    return NextResponse.json({ success: true });
  }

  if (kind === "toggle-task") {
    const id = String(body.id ?? "");
    const row = await db
      .select()
      .from(groupTasks)
      .where(and(eq(groupTasks.id, id), eq(groupTasks.groupId, groupId)))
      .get();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    await db
      .update(groupTasks)
      .set({ done: !row.done })
      .where(eq(groupTasks.id, id))
      .run();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "unknown kind" }, { status: 400 });
}
