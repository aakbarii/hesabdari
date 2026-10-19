import { readJsonObject } from "@/lib/validation";
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
import { isAdminEmail } from "@/lib/admin";
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
  await ensureDb();
  const body = await readJsonObject(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
  }

  const { email, password, name } = parsed.data;

  // The first account to claim the legacy workspace must be the administrator.
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "راه‌اندازی اولیه فقط برای مدیر مجاز است" }, { status: 403 });
  }

  if (await anyUserHasPassword()) {
    return NextResponse.json(
      { error: "حساب قبلاً فعال شده. از ثبت‌نام استفاده کنید." },
      { status: 400 }
    );
  }

  if (await getUserByEmail(email) && email !== "me@local.dev") {
    return NextResponse.json({ error: "این ایمیل قبلاً ثبت شده" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = await setupDefaultUserPassword(email, passwordHash, name ?? "من");
  const token = await signSession(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  return NextResponse.json({ ok: true, userId });
}
