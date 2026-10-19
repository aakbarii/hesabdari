import { NextResponse } from "next/server";
import { ensureDb, getTodosWeek } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

export async function GET(request: Request) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  return NextResponse.json(await getTodosWeek(auth, Number.isFinite(offset) ? offset : 0));
}
