import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { isAdminEmail } from "@/lib/admin";
import { z } from "zod";
import {
  ensureDb,
  getUserByEmail,
  createUserWithDefaults,
} from "@/lib/db/queries";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signSession,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6),
  name: z.string().trim().min(1),
  gender: z.enum(["male", "female"]),
}).strict();

export async function POST(request: Request) {
  await ensureDb();
  const body = await readJsonObject(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
  }

  const { email, password, name, gender } = parsed.data;
  // Public registration can never create an administrator, even before setup.
  if (isAdminEmail(email)) {
    return NextResponse.json({ error: "این ایمیل برای مدیر رزرو شده است؛ از صفحهٔ ورود استفاده کنید" }, { status: 403 });
  }
  if (await getUserByEmail(email)) {
    return NextResponse.json({ error: "این ایمیل قبلاً ثبت شده" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = await createUserWithDefaults(email, passwordHash, name, gender);
  const token = await signSession(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  return NextResponse.json({ ok: true, userId, role: "user", isAdmin: false });
}
