import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ensureDb, db, receiptFiles } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const row = await db
    .select()
    .from(receiptFiles)
    .where(and(eq(receiptFiles.id, id), eq(receiptFiles.userId, auth)))
    .get();

  if (!row) {
    return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
