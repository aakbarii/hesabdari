import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDb, getUserByEmail, createPasswordResetToken } from "@/lib/db/queries";
import {
  sendPasswordResetEmail,
  isSmtpConfigured,
  buildResetUrl,
} from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  ensureDb();
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ایمیل نامعتبر" }, { status: 400 });
  }

  const user = getUserByEmail(parsed.data.email);
  const genericMessage =
    "اگر این ایمیل ثبت شده باشد، لینک بازیابی ارسال می‌شود.";

  if (!user?.passwordHash) {
    return NextResponse.json({ message: genericMessage });
  }

  const token = await createPasswordResetToken(user.id);
  const resetUrl = buildResetUrl(token);

  let sentViaEmail = false;

  if (isSmtpConfigured()) {
    sentViaEmail = await sendPasswordResetEmail(
      user.email,
      user.name,
      resetUrl
    );
  }

  if (process.env.NODE_ENV === "development" && !sentViaEmail) {
    return NextResponse.json({
      message: genericMessage,
      devResetUrl: resetUrl,
    });
  }

  return NextResponse.json({
    message: genericMessage,
    sentViaEmail,
  });
}
