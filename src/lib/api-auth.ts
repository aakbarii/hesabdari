import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function getRequestUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySession(token);
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
