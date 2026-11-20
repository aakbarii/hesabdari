import { NextResponse } from "next/server";
export function retiredAuthRoute() {
  return NextResponse.json({ error: "این روش ورود در حسابداری فعال نیست." }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
