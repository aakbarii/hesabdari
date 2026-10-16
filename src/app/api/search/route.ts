import { NextResponse } from "next/server";
import { ensureDb, globalSearch } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

export async function GET(request: Request) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json([]);
  }

  return NextResponse.json(globalSearch(auth, q));
}
