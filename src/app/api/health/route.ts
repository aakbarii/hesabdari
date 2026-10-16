import { NextResponse } from "next/server";

/** Lightweight readiness probe — no DB, no auth. */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
