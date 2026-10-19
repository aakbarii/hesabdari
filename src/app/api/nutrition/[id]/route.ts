import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meals, waterLogs } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // Try deleting from meals
  await db.delete(meals)
    .where(and(eq(meals.id, id), eq(meals.userId, auth)))
    .run();

  // Try deleting from water
  await db.delete(waterLogs)
    .where(and(eq(waterLogs.id, id), eq(waterLogs.userId, auth)))
    .run();

  return NextResponse.json({ success: true });
}
