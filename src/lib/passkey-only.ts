import { NextResponse } from "next/server";
/** Password-based registration, login, setup and recovery have been retired. */
export function passwordAuthRemoved() {
  return NextResponse.json({ error: "ورود با رمز حذف شده است؛ از کلید ورود دستگاه استفاده کن" }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
