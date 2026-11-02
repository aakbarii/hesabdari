import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passkeyCredentials } from "@/lib/db/schema";
import { ensureDb, getUserById } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { readJsonObject } from "@/lib/validation";
import { passkeyProfileSchema } from "@/lib/passkey-profile";
const schema = z.object({ passkeyProfile: passkeyProfileSchema }).strict();
export async function GET() {
  await ensureDb(); const auth = await requireUserId(); if (auth instanceof NextResponse) return auth;
  const user = await getUserById(auth); if (!user) return NextResponse.json({ error: "حساب پیدا نشد" }, { status: 404 });
  const keys = await db.select({ id: passkeyCredentials.id }).from(passkeyCredentials).where(eq(passkeyCredentials.userId, auth)).all();
  return NextResponse.json({ id: user.id, name: user.name, firstName: user.firstName, lastName: user.lastName, passkeyCount: keys.length });
}
export async function PATCH(request: Request) {
  await ensureDb(); const auth = await requireUserId(); if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await readJsonObject(request)); if (!parsed.success) return NextResponse.json({ error: "نام و نام خانوادگی را بررسی کن" }, { status: 400 });
  const data = parsed.data.passkeyProfile;
  await db.update(users).set({ ...data, name: `${data.firstName} ${data.lastName}` }).where(eq(users.id, auth)).run();
  return NextResponse.json({ ok: true });
}
