import { NextResponse } from "next/server";
import moment from "jalali-moment";
import { ensureDb, getAnnualReport } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

export async function GET(request: Request) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(moment().jYear()));

  const report = getAnnualReport(userId, year);
  return NextResponse.json(report);
}
