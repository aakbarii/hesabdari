import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/db/queries";
import { requireAdmin, getUserDataForAdmin } from "@/lib/admin-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb();
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;
  const data = await getUserDataForAdmin(id);
  if (!data) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  return NextResponse.json(data);
}
