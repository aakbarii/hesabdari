import { createHmac, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, signSession } from "@/lib/auth";
import { db, getClient } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ensureDb, getUserByEmail, seedUserDefaults } from "@/lib/db/queries";
import { getSessionSecret } from "@/lib/session-secret";
import { readJsonObject } from "@/lib/validation";

const hashPrefix = "hesabdari-password:";
const credentials = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  password: z.string().max(72).refine(value => Array.from(value).length >= 12 && Buffer.byteLength(value, "utf8") <= 72),
});
const registration = credentials.extend({
  name: z.string().trim().min(2).max(120),
  locale: z.enum(["fa", "en"]).optional(),
}).strict();
const windowMs = 10 * 60 * 1000;
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function isThrottled(key: string, limit: number) {
  const id = createHmac("sha256", getSessionSecret()).update(key).digest("hex");
  const now = Date.now();
  const result = await getClient().execute({
    sql: `INSERT INTO passkey_rate_limits (id, window_start, count) VALUES (?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        count = CASE WHEN window_start < ? THEN 1 ELSE count + 1 END,
        window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END
      RETURNING count`,
    args: [id, now, now - windowMs, now - windowMs],
  });
  return Number(result.rows[0].count) > limit;
}

export async function passwordAccess(request: Request, register: boolean) {
  const origin = new URL(request.url);
  const host = request.headers.get("host") ?? origin.host;
  if (request.headers.get("origin") !== `${origin.protocol}//${host}` ||
      (origin.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(origin.hostname))) {
    return reply({ error: "آدرس درخواست معتبر نیست" }, 403);
  }
  const body = await readJsonObject(request);
  const signup = register ? registration.safeParse(body) : null;
  const parsed = signup ?? credentials.strict().safeParse(body);
  if (!parsed.success) return reply({ error: "اطلاعات را بررسی کن. رمز باید حداقل ۱۲ نویسه و حداکثر ۷۲ بایت باشد." }, 400);

  const { email, password } = parsed.data;
  await ensureDb();
  const client = getClient();
  await client.execute({ sql: "DELETE FROM passkey_rate_limits WHERE window_start < ?", args: [Date.now() - 6 * windowMs] });
  const ip = (request.headers.get("x-vercel-forwarded-for") || "local").split(",")[0].trim();
  const action = register ? "register" : "login";
  if (await isThrottled(`password:${action}:ip:${ip}`, 30) ||
      await isThrottled(`password:${action}:email:${email}`, 10)) {
    return reply({ error: "تلاش‌های زیادی انجام شده. چند دقیقه بعد دوباره امتحان کن." }, 429);
  }

  let userId: string;
  if (signup?.success) {
    if (isAdminEmail(email) || await getUserByEmail(email)) {
      return reply({ error: "با این ایمیل نمی‌شود حساب جدید ساخت." }, 409);
    }
    const { name, locale } = signup.data;
    userId = randomUUID();
    const passwordHash = hashPrefix + await bcrypt.hash(password, 12);
    const created = await db.transaction(async tx => {
      const inserted = await tx.insert(users).values({ id: userId, email, name, passwordHash })
        .onConflictDoNothing({ target: users.email }).returning({ id: users.id });
      if (!inserted.length) return false;
      await seedUserDefaults(userId, { locale: locale ?? "fa" }, tx);
      return true;
    });
    if (!created) return reply({ error: "با این ایمیل نمی‌شود حساب جدید ساخت." }, 409);
  } else {
    const user = await getUserByEmail(email);
    const hash = user?.passwordHash;
    if (!user || !hash?.startsWith(hashPrefix) || !await bcrypt.compare(password, hash.slice(hashPrefix.length))) {
      return reply({ error: "ایمیل یا رمز درست نیست." }, 401);
    }
    userId = user.id;
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(userId), SESSION_COOKIE_OPTIONS);
  return reply({ ok: true });
}
