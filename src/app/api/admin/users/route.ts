import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/db/queries";
import { requireAdmin, listUsersForAdmin } from "@/lib/admin-data";

export async function GET() {
  await ensureDb();
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json({ users: await listUsersForAdmin() });
}
