import { NextResponse } from "next/server";
import { ensureDb, getReminders } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

export async function GET() {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(getReminders(auth));
}
