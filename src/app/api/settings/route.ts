import { readJsonObject } from "@/lib/validation";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureDb,
  getUserSettings,
  updateUserCurrency,
  updateUserAppearance,
  updateUserLocale,
  updateUserGender,
  updateHealthTargets,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { isCurrencyUnit } from "@/lib/currency";
import {
  ACCENT_COLORS,
  APPEARANCE_MOODS,
  getAllNavHrefs,
} from "@/lib/appearance";

function settingsPayload(settings: Awaited<ReturnType<typeof getUserSettings>>) {
  return {
    currencyUnit: settings.currencyUnit,
    widgets: settings.widgets,
    anomalyThreshold: settings.anomalyThreshold,
    appearanceMood: settings.appearanceMood,
    accentColor: settings.accentColor,
    visibleNav: settings.visibleNav,
    mobileNav: settings.mobileNav,
    locale: settings.locale,
    gender: settings.gender,
    healthTargets: settings.healthTargets,
  };
}

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const settings = await getUserSettings(auth);
  return NextResponse.json(settingsPayload(settings));
}

const patchSchema = z.object({
  currencyUnit: z.enum(["toman", "rial"]).optional(),
  appearanceMood: z
    .enum([
      "neutral",
      "feminine",
      "masculine",
      "ocean",
      "sunset",
      "forest",
      "minimal",
      "cozy",
    ])
    .optional(),
  accentColor: z
    .enum(ACCENT_COLORS.map((c) => c.id) as [string, ...string[]])
    .optional(),
  visibleNav: z.array(z.string()).optional(),
  mobileNav: z.array(z.string()).optional(),
  locale: z.enum(["fa", "en"]).optional(),
  gender: z.enum(["male", "female"]).optional(),
  healthTargets: z
    .object({
      sleepHours: z.number().positive().max(16).optional(),
      calories: z.number().positive().max(10000).optional(),
      protein: z.number().nonnegative().max(500).optional(),
      carbs: z.number().nonnegative().max(1000).optional(),
      fat: z.number().nonnegative().max(400).optional(),
      waterMl: z.number().positive().max(10000).optional(),
    })
    .optional(),
});

export async function PATCH(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await readJsonObject(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const {
    currencyUnit,
    appearanceMood,
    accentColor,
    visibleNav,
    mobileNav,
    locale,
    gender,
    healthTargets,
  } = parsed.data;

  if (
    !currencyUnit &&
    !appearanceMood &&
    !accentColor &&
    visibleNav === undefined &&
    mobileNav === undefined &&
    !locale &&
    !gender &&
    !healthTargets
  ) {
    return NextResponse.json({ error: "تغییری ارسال نشد" }, { status: 400 });
  }

  if (healthTargets) {
    await updateHealthTargets(userId, healthTargets);
  }

  if (currencyUnit && isCurrencyUnit(currencyUnit)) {
    await updateUserCurrency(userId, currencyUnit);
  }

  if (locale) {
    await updateUserLocale(userId, locale);
  }

  if (gender) {
    await updateUserGender(userId, gender);
  }

  if (
    appearanceMood ||
    accentColor ||
    visibleNav !== undefined ||
    mobileNav !== undefined
  ) {
    const allowed = new Set(getAllNavHrefs());
    if (visibleNav) {
      const invalid = visibleNav.some((h) => !allowed.has(h));
      if (invalid) {
        return NextResponse.json({ error: "مسیر نامعتبر" }, { status: 400 });
      }
    }
    if (mobileNav) {
      const invalid = mobileNav.some((h) => !allowed.has(h));
      if (invalid) {
        return NextResponse.json({ error: "مسیر نامعتبر" }, { status: 400 });
      }
    }
    await updateUserAppearance(userId, {
      appearanceMood: appearanceMood as keyof typeof APPEARANCE_MOODS | undefined,
      accentColor: accentColor as (typeof ACCENT_COLORS)[number]["id"] | undefined,
      visibleNav,
      mobileNav,
    });
  }

  const settings = await getUserSettings(userId);
  return NextResponse.json(settingsPayload(settings));
}
