import { NextResponse } from "next/server";
import { ensureDb, getUserById, getUserSettings } from "@/lib/db/queries";
import { getRequestUserId } from "@/lib/api-auth";
import { getUserRole } from "@/lib/admin";

export async function GET() {
  await ensureDb();
  const userId = await getRequestUserId();
  if (!userId) {
    return NextResponse.json({
      user: null,
      needsSetup: false,
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
      firstName: user.firstName,
      lastName: user.lastName,
      role: getUserRole(user.email),
      isAdmin: getUserRole(user.email) === "admin",
    },
    needsSetup: false,
    onboardingCompleted: settings.onboardingCompleted,
  });
}
