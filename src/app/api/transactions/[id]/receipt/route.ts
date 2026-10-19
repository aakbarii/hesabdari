import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { ensureDb, db, transactions, receiptFiles } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { id } = await params;

  const tx = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .get();
  if (!tx) {
    return NextResponse.json({ error: "تراکنش یافت نشد" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "فایل یافت نشد" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) {
    return NextResponse.json({ error: "فرمت مجاز نیست" }, { status: 400 });
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return NextResponse.json({ error: "حجم فایل بیش از ۵ مگابایت است" }, { status: 413 });
  }

  const filename = `${id}.${ext}`;
  const data = Buffer.from(await file.arrayBuffer());

  await db
    .insert(receiptFiles)
    .values({ id: filename, userId, mimeType, data, createdAt: new Date() })
    .onConflictDoUpdate({
      target: receiptFiles.id,
      set: { mimeType, data, createdAt: new Date() },
    })
    .run();

  // Replace an older receipt stored under a different extension.
  if (tx.receiptPath && tx.receiptPath !== filename) {
    await db
      .delete(receiptFiles)
      .where(and(eq(receiptFiles.id, tx.receiptPath), eq(receiptFiles.userId, userId)))
      .run();
  }

  await db
    .update(transactions)
    .set({ receiptPath: filename })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .run();

  return NextResponse.json({ receiptPath: filename });
}
