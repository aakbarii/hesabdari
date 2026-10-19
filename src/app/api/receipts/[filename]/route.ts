import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ensureDb, db, receiptFiles } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { groupMembers, groupPettyCashItems } from "@/lib/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { filename } = await params;
  let row = await db
    .select()
    .from(receiptFiles)
    .where(and(eq(receiptFiles.id, filename), eq(receiptFiles.userId, userId)))
    .get();

  if (!row) {
    // Allow group members to view receipts attached to petty-cash items
    const item = await db
      .select()
      .from(groupPettyCashItems)
      .where(eq(groupPettyCashItems.receiptPath, filename))
      .get();
    if (item) {
      const member = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, item.groupId),
            eq(groupMembers.userId, userId)
          )
        )
        .get();
      if (member) {
        row = await db
          .select()
          .from(receiptFiles)
          .where(eq(receiptFiles.id, filename))
          .get();
      }
    }
  }

  if (!row) {
    return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
