import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { db } from "@/lib/db";
import { receiptFiles } from "@/lib/db/schema";
import {
  ensureDb,
  getUserSettings,
  updatePageHeroPref,
} from "@/lib/db/queries";
import { readJsonObject } from "@/lib/validation";
import {
  CUSTOMIZABLE_HERO_KEYS,
  PAGE_HEROES,
  isPageHeroKey,
  resolveHeroSrc,
  type PageHeroKey,
} from "@/lib/page-heroes";

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const settings = await getUserSettings(auth);
  const resolved = Object.fromEntries(
    CUSTOMIZABLE_HERO_KEYS.map((key) => {
      const r = resolveHeroSrc(key, settings.pageHeroes);
      return [key, r];
    })
  );

  return NextResponse.json({
    prefs: settings.pageHeroes,
    resolved,
    defaults: PAGE_HEROES,
  });
}

export async function PATCH(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonObject(request);
  const key = body.key;
  if (!isPageHeroKey(key) || key === "login") {
    return NextResponse.json({ error: "کلید نامعتبر" }, { status: 400 });
  }

  const action = String(body.action ?? "");

  if (action === "hide") {
    const prefs = await updatePageHeroPref(auth, key, { hidden: true });
    return NextResponse.json({ prefs, ...resolveHeroSrc(key, prefs) });
  }

  if (action === "show") {
    const current = (await getUserSettings(auth)).pageHeroes[key];
    const prefs = await updatePageHeroPref(auth, key, {
      hidden: false,
      fileId: current?.fileId ?? null,
    });
    return NextResponse.json({ prefs, ...resolveHeroSrc(key, prefs) });
  }

  if (action === "reset") {
    const prev = (await getUserSettings(auth)).pageHeroes[key];
    if (prev?.fileId) {
      await db
        .delete(receiptFiles)
        .where(eq(receiptFiles.id, prev.fileId))
        .run();
    }
    const prefs = await updatePageHeroPref(auth, key, null);
    return NextResponse.json({ prefs, ...resolveHeroSrc(key, prefs) });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export async function POST(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const form = await request.formData();
  const keyRaw = String(form.get("key") ?? "");
  const file = form.get("file");
  if (!isPageHeroKey(keyRaw) || keyRaw === "login") {
    return NextResponse.json({ error: "کلید نامعتبر" }, { status: 400 });
  }
  const key = keyRaw as PageHeroKey;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایل لازم است" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "فقط تصویر" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 4_000_000) {
    return NextResponse.json({ error: "حداکثر ۴ مگابایت" }, { status: 400 });
  }

  const prev = (await getUserSettings(auth)).pageHeroes[key];
  if (prev?.fileId) {
    await db.delete(receiptFiles).where(eq(receiptFiles.id, prev.fileId)).run();
  }

  const id = nanoid();
  await db
    .insert(receiptFiles)
    .values({
      id,
      userId: auth,
      mimeType: file.type || "image/jpeg",
      data: buf,
    })
    .run();

  const prefs = await updatePageHeroPref(auth, key, {
    hidden: false,
    fileId: id,
  });

  return NextResponse.json({
    prefs,
    ...resolveHeroSrc(key, prefs),
  });
}
