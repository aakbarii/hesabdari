import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  ensureDb,
  getUserByEmail,
  anyUserHasPassword,
  setupDefaultUserPassword,
} from "@/lib/db/queries";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signSession,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  ensureDb();
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
  }

  const { email, password, name } = parsed.data;

  if (anyUserHasPassword()) {
    return NextResponse.json(
      { error: "حساب قبلاً فعال شده. از ثبت‌نام استفاده کنید." },
      { status: 400 }
    );
  }

  if (getUserByEmail(email) && email !== "me@local.dev") {
    return NextResponse.json({ error: "این ایمیل قبلاً ثبت شده" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = setupDefaultUserPassword(email, passwordHash, name ?? "من");
  const token = await signSession(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  return NextResponse.json({ ok: true, userId });
}
