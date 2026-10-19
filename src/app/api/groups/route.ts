import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  groupMembers,
  groupMoodShares,
  groups,
  users,
} from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { ensureDb } from "@/lib/db/queries";

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

const createSchema = z.object({
  name: z.string().min(2).max(60),
});

const joinSchema = z.object({
  code: z.string().min(4).max(12),
});

const shareSchema = z.object({
  groupId: z.string().min(1),
  mood: z.enum(["great", "good", "neutral", "tired", "bad"]),
  note: z.string().max(280).optional().nullable(),
  date: z.string().min(8),
});

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");

  const memberships = await db
    .select({
      id: groups.id,
      name: groups.name,
      inviteCode: groups.inviteCode,
      ownerId: groups.ownerId,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, auth))
    .all();

  if (!groupId) {
    return NextResponse.json({ groups: memberships });
  }

  const member = memberships.find((g) => g.id === groupId);
  if (!member) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const members = await db
    .select({
      userId: groupMembers.userId,
      role: groupMembers.role,
      name: users.name,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId))
    .all();

  const feed = await db
    .select({
      id: groupMoodShares.id,
      mood: groupMoodShares.mood,
      note: groupMoodShares.note,
      date: groupMoodShares.date,
      createdAt: groupMoodShares.createdAt,
      userId: groupMoodShares.userId,
      userName: users.name,
    })
    .from(groupMoodShares)
    .innerJoin(users, eq(users.id, groupMoodShares.userId))
    .where(eq(groupMoodShares.groupId, groupId))
    .orderBy(desc(groupMoodShares.createdAt))
    .limit(40)
    .all();

  return NextResponse.json({ group: member, members, feed });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);
  const action = typeof body.action === "string" ? body.action : "create";

  if (action === "join") {
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const code = parsed.data.code.trim().toUpperCase();
    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.inviteCode, code))
      .get();
    if (!group) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const existing = await db
      .select()
      .from(groupMembers)
      .where(
        and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, auth))
      )
      .get();
    if (!existing) {
      await db
        .insert(groupMembers)
        .values({
          id: nanoid(),
          groupId: group.id,
          userId: auth,
          role: "member",
        })
        .run();
    }
    return NextResponse.json({ success: true, groupId: group.id });
  }

  if (action === "share") {
    const parsed = shareSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const member = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, parsed.data.groupId),
          eq(groupMembers.userId, auth)
        )
      )
      .get();
    if (!member) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const id = nanoid();
    await db
      .insert(groupMoodShares)
      .values({
        id,
        groupId: parsed.data.groupId,
        userId: auth,
        mood: parsed.data.mood,
        note: parsed.data.note ?? null,
        date: parsed.data.date,
      })
      .run();
    return NextResponse.json({ success: true, id });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const id = nanoid();
  let code = inviteCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db
      .select()
      .from(groups)
      .where(eq(groups.inviteCode, code))
      .get();
    if (!clash) break;
    code = inviteCode();
  }

  await db
    .insert(groups)
    .values({
      id,
      name: parsed.data.name.trim(),
      inviteCode: code,
      ownerId: auth,
    })
    .run();
  await db
    .insert(groupMembers)
    .values({
      id: nanoid(),
      groupId: id,
      userId: auth,
      role: "owner",
    })
    .run();

  return NextResponse.json({ success: true, id, inviteCode: code });
}
