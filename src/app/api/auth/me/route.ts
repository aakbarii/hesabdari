import { NextResponse } from "next/server";
import { ensureDb, getUserById, anyUserHasPassword, getUserSettings } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/api-auth";

export async function GET() {
  ensureDb();
  const userId = await getRequestUserId();
  if (!userId) {
    return NextResponse.json({
      user: null,
      needsSetup: !anyUserHasPassword(),
    });
  }
  const user = getUserById(userId);
  if (!user) {
    return NextResponse.json({ user: null, needsSetup: false });
  }
  const settings = getUserSettings(userId);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      totpEnabled: Boolean(user.totpEnabled),
    },
    needsSetup: false,
    onboardingCompleted: settings.onboardingCompleted,
  });
}
