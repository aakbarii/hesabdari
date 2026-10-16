import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  ensureDb,
  consumePasswordResetToken,
  getUserById,
  db,
  users,
} from "@/lib/db/queries";
import { eq } from "drizzle-orm";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  ensureDb();
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const userId = await consumePasswordResetToken(parsed.data.token);
  if (!userId) {
    return NextResponse.json(
      { error: "لینک نامعتبر یا منقضی شده است" },
      { status: 400 }
    );
  }

  const user = getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  db.update(users).set({ passwordHash }).where(eq(users.id, userId)).run();

  return NextResponse.json({ ok: true });
}
