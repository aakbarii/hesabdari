import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { ensureDb, getUserByEmail, createPending2faToken } from "@/lib/db/queries";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signSession,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  ensureDb();
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
  }

  const user = getUserByEmail(parsed.data.email);
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "ایمیل یا رمز اشتباه است" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "ایمیل یا رمز اشتباه است" }, { status: 401 });
  }

  if (user.totpEnabled && user.totpSecret) {
    const pendingToken = await createPending2faToken(user.id);
    return NextResponse.json({
      requires2fa: true,
      pendingToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  }

  const token = await signSession(user.id);
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
}
