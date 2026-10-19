import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  ensureDb,
  getUserById,
  setTotpPendingSecret,
  enableTotp,
  disableTotp,
  getPending2faUserId,
  consumePending2faToken,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { createTotpSetup, verifyTotpCode } from "@/lib/totp";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signSession,
} from "@/lib/auth";

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const user = await getUserById(auth);
  if (!user) {
    return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({
    enabled: Boolean(user.totpEnabled),
  });
}

export async function POST() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const user = await getUserById(auth);
  if (!user) {
    return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  }

  if (user.totpEnabled) {
    return NextResponse.json({ error: "۲FA قبلاً فعال است" }, { status: 400 });
  }

  const setup = createTotpSetup(user.email);
  await setTotpPendingSecret(auth, setup.secret);

  return NextResponse.json({
    secret: setup.secret,
    uri: setup.uri,
  });
}

const enableSchema = z.object({
  code: z.string().min(6).max(8),
});

export async function PUT(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const user = await getUserById(auth);
  if (!user?.totpPendingSecret) {
    return NextResponse.json({ error: "ابتدا راه‌اندازی را شروع کنید" }, { status: 400 });
  }

  const body = await readJsonObject(request);
  const parsed = enableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "کد نامعتبر" }, { status: 400 });
  }

  if (!verifyTotpCode(user.totpPendingSecret, parsed.data.code)) {
    return NextResponse.json({ error: "کد تأیید اشتباه است" }, { status: 400 });
  }

  await enableTotp(auth);
  return NextResponse.json({ ok: true, enabled: true });
}

const disableSchema = z.object({
  password: z.string().min(1),
  code: z.string().min(6).max(8),
});

export async function DELETE(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const user = await getUserById(auth);
  if (!user?.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "۲FA فعال نیست" }, { status: 400 });
  }

  const body = await readJsonObject(request);
  const parsed = disableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  if (!user.passwordHash) {
    return NextResponse.json({ error: "رمز تنظیم نشده" }, { status: 400 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "رمز اشتباه است" }, { status: 400 });
  }

  if (!verifyTotpCode(user.totpSecret, parsed.data.code)) {
    return NextResponse.json({ error: "کد تأیید اشتباه است" }, { status: 400 });
  }

  await disableTotp(auth);
  return NextResponse.json({ ok: true, enabled: false });
}

const verifyLoginSchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(6).max(8),
});

export async function PATCH(request: Request) {
  await ensureDb();
  const body = await readJsonObject(request);
  const parsed = verifyLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const userId = await getPending2faUserId(parsed.data.pendingToken);
  if (!userId) {
    return NextResponse.json(
      { error: "نشست منقضی شده. دوباره وارد شوید." },
      { status: 400 }
    );
  }

  const user = await getUserById(userId);
  if (!user?.totpSecret || !user.totpEnabled) {
    return NextResponse.json({ error: "۲FA فعال نیست" }, { status: 400 });
  }

  if (!verifyTotpCode(user.totpSecret, parsed.data.code)) {
    return NextResponse.json({ error: "کد تأیید اشتباه است" }, { status: 401 });
  }

  if (await consumePending2faToken(parsed.data.pendingToken) !== user.id) {
    return NextResponse.json({ error: "نشست منقضی شده. دوباره وارد شوید." }, { status: 401 });
  }
  const token = await signSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
}
