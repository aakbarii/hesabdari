import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workouts, bodyMetrics } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  await db.delete(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, auth)))
    .run();

  await db.delete(bodyMetrics)
    .where(and(eq(bodyMetrics.id, id), eq(bodyMetrics.userId, auth)))
    .run();

  return NextResponse.json({ success: true });
}
