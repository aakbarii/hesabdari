import { NextResponse } from "next/server";
import { ensureDb, getUserById, anyUserHasPassword, getUserSettings } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/api-auth";
import { getUserRole, isAdminSetupAvailable } from "@/lib/admin";

export async function GET() {
  await ensureDb();
  const userId = await getRequestUserId();
  if (!userId) {
    return NextResponse.json({
      user: null,
      needsSetup: isAdminSetupAvailable() && !(await anyUserHasPassword()),
    });
  }
  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ user: null, needsSetup: false });
  }
  const settings = await getUserSettings(userId);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: getUserRole(user.email),
      isAdmin: getUserRole(user.email) === "admin",
    },
    needsSetup: false,
    onboardingCompleted: settings.onboardingCompleted,
  });
}
