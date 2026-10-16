import { NextResponse } from "next/server";
import moment from "jalali-moment";
import { ensureDb, compareMonths } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

export async function GET(request: Request) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(moment().jYear()));
  const month = parseInt(
    searchParams.get("month") ?? String(moment().jMonth() + 1)
  );

  return NextResponse.json(compareMonths(auth, year, month));
}
