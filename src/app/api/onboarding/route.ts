import { NextResponse } from "next/server";
import { ensureDb, completeOnboarding, getUserSettings } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

export async function GET() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const settings = await getUserSettings(auth);
  return NextResponse.json({
    completed: settings.onboardingCompleted,
  });
}

export async function POST() {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  await completeOnboarding(auth);
  return NextResponse.json({ ok: true });
}
