import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { ensureDb, getUserById } from "@/lib/db/queries";
import { DEFAULT_USER_ID } from "@/lib/constants";
import { AUTH_ENABLED } from "@/lib/app-config";

export async function getRequestUserId(): Promise<string | null> {
  // Login is temporarily disabled: every request uses the local workspace.
  // Ignore old session cookies so the selected workspace stays consistent.
  if (!AUTH_ENABLED) {
    await ensureDb();
    return DEFAULT_USER_ID;
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySession(token);
  if (!userId) return null;
  await ensureDb();
  return await getUserById(userId) ? userId : null;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "لطفاً وارد شوید" }, { status: 401 });
}

export async function requireUserId(): Promise<string | NextResponse> {
  const userId = await getRequestUserId();
  if (!userId) return unauthorizedResponse();
  return userId;
}

export async function resolveUserId(
  fallback?: string
): Promise<string | NextResponse> {
  const userId = await getRequestUserId();
  if (userId) return userId;
  if (fallback) return fallback;
  return unauthorizedResponse();
}
