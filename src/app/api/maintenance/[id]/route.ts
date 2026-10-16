import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicleServices } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  db.delete(vehicleServices)
    .where(and(eq(vehicleServices.id, id), eq(vehicleServices.userId, auth)))
    .run();

  return NextResponse.json({ success: true });
}
