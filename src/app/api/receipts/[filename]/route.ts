import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "نامعتبر" }, { status: 400 });
  }

  const filepath = path.join(process.cwd(), "data", "receipts", filename);
  try {
    const buffer = await readFile(filepath);
    const ext = filename.split(".").pop() ?? "jpg";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });
  }
}
