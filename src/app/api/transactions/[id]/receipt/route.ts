import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { ensureDb, db, transactions } from "@/lib/db/queries";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;

  const tx = db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
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
  const allowed = ["jpg", "jpeg", "png", "webp", "pdf"];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: "فرمت مجاز نیست" }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "data", "receipts");
  await mkdir(dir, { recursive: true });

  const filename = `${id}.${ext}`;
  const filepath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  db.update(transactions)
    .set({ receiptPath: filename })
    .where(eq(transactions.id, id))
    .run();

  return NextResponse.json({ receiptPath: filename });
}
