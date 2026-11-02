import { randomBytes, randomUUID, createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse, type AuthenticationResponseJSON, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { db, getClient } from "@/lib/db";
import { users, passkeyCredentials } from "@/lib/db/schema";
import { ensureDb, seedUserDefaults } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/api-auth";
import { getUserRole, isAdminEmail } from "@/lib/admin";
import { getSessionSecret } from "@/lib/session-secret";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, signSession } from "@/lib/auth";
import { readJsonObject } from "@/lib/validation";
import { passkeyProfileSchema } from "@/lib/passkey-profile";

export const runtime = "nodejs";
const CHALLENGE_COOKIE = "joojo_passkey_challenge";
const FIVE_MINUTES = 5 * 60 * 1000;
const bodySchema = z.object({
  action: z.enum(["register_options", "login_options", "link_options", "register_verify", "login_verify", "link_verify"]),
  profile: passkeyProfileSchema.optional(),
  credential: z.record(z.string(), z.unknown()).optional(),
}).strict();
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
function reply(data: object, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const context = new URL(process.env.PASSKEY_ORIGIN || request.url);
  const origin = context.origin;
  if (request.headers.get("origin") !== origin || (context.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(context.hostname))) {
    return reply({ error: "درخواست ورود از آدرس معتبر سایت ارسال نشده است" }, 403);
  }
  const parsed = bodySchema.safeParse(await readJsonObject(request));
  if (!parsed.success) return reply({ error: "نام، نام خانوادگی، شماره موبایل و عکس را بررسی کن" }, 400);
  await ensureDb();
  const { action, profile, credential: response } = parsed.data;
  const jar = await cookies();
  const client = getClient();
  if (action.endsWith("_options")) {
    // Shared durable throttling also works across independent Vercel functions.
    const ip = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "local";
    const bucket = createHmac("sha256", getSessionSecret()).update(ip.split(",")[0].trim()).digest("hex");
    const now = Date.now();
    await client.execute({ sql: "DELETE FROM passkey_challenges WHERE expires_at < ?", args: [now] });
    await client.execute({ sql: "DELETE FROM passkey_rate_limits WHERE window_start < ?", args: [now - 3600000] });
    const rate = await client.execute({ sql: `INSERT INTO passkey_rate_limits(id,window_start,count) VALUES(?,?,1)
      ON CONFLICT(id) DO UPDATE SET count=CASE WHEN window_start < ? THEN 1 ELSE count+1 END,
      window_start=CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END RETURNING count`, args: [bucket, now, now-600000, now-600000] });
    if (Number(rate.rows[0].count) > 40) return reply({ error: "درخواست‌های زیادی فرستاده‌ای؛ چند دقیقه بعد دوباره تلاش کن" }, 429);
    const link = action === "link_options";
    const currentUser = await getRequestUserId();
    if (link && !currentUser) return reply({ error: "ابتدا وارد حساب فعلی شو" }, 401);
    if (action === "register_options" && currentUser) return reply({ error: "برای حساب فعلی از تنظیمات، کلید ورود اضافه کن" }, 409);
    if (action !== "login_options" && !profile) return reply({ error: "اطلاعات پروفایل کامل نیست" }, 400);
    const userId = link ? currentUser! : action === "register_options" ? randomUUID() : null;
    const existing = link ? await db.select().from(passkeyCredentials).where(eq(passkeyCredentials.userId, userId!)).all() : [];
    if (existing.length >= 5) return reply({ error: "این حساب پنج کلید ورود دارد" }, 409);
    const options = action === "login_options"
      ? await generateAuthenticationOptions({ rpID: context.hostname, userVerification: "required", timeout: 60000 })
      : await generateRegistrationOptions({ rpName: "جوجو", rpID: context.hostname, userID: new TextEncoder().encode(userId!), userName: userId!, userDisplayName: `${profile!.firstName} ${profile!.lastName}`, attestationType: "none", timeout: 60000, authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" }, excludeCredentials: existing.map(c => ({ id: c.id })), supportedAlgorithmIDs: [-7, -257] });
    const opaque = randomBytes(32).toString("base64url");
    const previous = jar.get(CHALLENGE_COOKIE)?.value;
    if (previous) await client.execute({ sql: "DELETE FROM passkey_challenges WHERE id=?", args: [hash(previous)] });
    await client.execute({ sql: "INSERT INTO passkey_challenges(id,challenge,kind,user_id,profile,origin,rp_id,expires_at) VALUES(?,?,?,?,?,?,?,?)", args: [hash(opaque), options.challenge, action.replace("_options", ""), userId, profile ? JSON.stringify(profile) : null, origin, context.hostname, now+FIVE_MINUTES] });
    jar.set(CHALLENGE_COOKIE, opaque, { httpOnly: true, secure: context.protocol === "https:", sameSite: "strict", path: "/api/auth/passkey", maxAge: 300 });
    return reply({ options });
  }
  if (!response) return reply({ error: "تأیید دستگاه دریافت نشد" }, 400);
  const opaque = jar.get(CHALLENGE_COOKIE)?.value;
  jar.set(CHALLENGE_COOKIE, "", { httpOnly: true, secure: context.protocol === "https:", sameSite: "strict", path: "/api/auth/passkey", maxAge: 0 });
  if (!opaque) return reply({ error: "درخواست ورود منقضی شده؛ دوباره تلاش کن" }, 400);
  // Atomic consumption prevents replay, including concurrent requests.
  const consumed = await client.execute({ sql: "DELETE FROM passkey_challenges WHERE id=? AND expires_at>? RETURNING *", args: [hash(opaque), Date.now()] });
  const challenge = consumed.rows[0];
  if (!challenge || challenge.kind !== action.replace("_verify", "") || challenge.origin !== origin || challenge.rp_id !== context.hostname) return reply({ error: "درخواست ورود معتبر نیست یا منقضی شده" }, 400);
  try {
    let userId: string;
    if (action === "login_verify") {
      const credential = await db.select().from(passkeyCredentials).where(eq(passkeyCredentials.id, String(response.id))).get();
      if (!credential) return reply({ error: "این کلید به حسابی در این سایت متصل نیست" }, 401);
      const assertion = response as unknown as AuthenticationResponseJSON;
      if (assertion.response.userHandle && assertion.response.userHandle !== Buffer.from(credential.userId).toString("base64url")) return reply({ error: "کلید ورود متعلق به این حساب نیست" }, 401);
      const verified = await verifyAuthenticationResponse({ response: assertion, expectedChallenge: String(challenge.challenge), expectedOrigin: origin, expectedRPID: context.hostname, requireUserVerification: true, credential: { id: credential.id, publicKey: new Uint8Array(credential.publicKey), counter: credential.counter } });
      if (!verified.verified) return reply({ error: "تأیید دستگاه معتبر نیست" }, 401);
      const updated = await db.update(passkeyCredentials).set({ counter: verified.authenticationInfo.newCounter, backedUp: verified.authenticationInfo.credentialBackedUp }).where(and(eq(passkeyCredentials.id, credential.id), eq(passkeyCredentials.counter, credential.counter))).returning({ id: passkeyCredentials.id });
      if (!updated.length) return reply({ error: "دوباره با دستگاهت تأیید کن" }, 409);
      userId = credential.userId;
    } else {
      userId = String(challenge.user_id);
      const link = action === "link_verify";
      if (link && await getRequestUserId() !== userId) return reply({ error: "نشست حساب تغییر کرده؛ دوباره وارد شو" }, 401);
      const verified = await verifyRegistrationResponse({ response: response as unknown as RegistrationResponseJSON, expectedChallenge: String(challenge.challenge), expectedOrigin: origin, expectedRPID: context.hostname, requireUserVerification: true, supportedAlgorithmIDs: [-7, -257] });
      if (!verified.verified) return reply({ error: "تأیید دستگاه معتبر نیست" }, 401);
      const data = passkeyProfileSchema.parse(JSON.parse(String(challenge.profile)));
      const info = verified.registrationInfo;
      // Phone is contact data, never an unverified account lookup/recovery key.
      const email = `${userId}@passkey.local.invalid`;
      if (!link && isAdminEmail(email)) return reply({ error: "ایجاد حساب انجام نشد؛ دوباره تلاش کن" }, 409);
      await db.transaction(async tx => {
        const fields = { firstName: data.firstName, lastName: data.lastName, name: `${data.firstName} ${data.lastName}`, phone: data.phone, avatarId: data.avatarId };
        if (link) await tx.update(users).set(fields).where(eq(users.id, userId)).run();
        else { await tx.insert(users).values({ id: userId, email, ...fields }).run(); await seedUserDefaults(userId, undefined, tx); }
        await tx.insert(passkeyCredentials).values({ id: info.credential.id, userId, publicKey: Buffer.from(info.credential.publicKey), counter: info.credential.counter, transports: JSON.stringify(info.credential.transports ?? []), deviceType: info.credentialDeviceType, backedUp: info.credentialBackedUp, createdAt: Date.now() }).run();
      });
    }
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) return reply({ error: "حساب پیدا نشد" }, 401);
    jar.set(SESSION_COOKIE, await signSession(userId), SESSION_COOKIE_OPTIONS);
    return reply({ ok: true, role: getUserRole(user.email), isAdmin: getUserRole(user.email) === "admin" });
  } catch {
    return reply({ error: "تأیید دستگاه انجام نشد؛ دوباره تلاش کن" }, 400);
  }
}
