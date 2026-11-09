import { readJsonObject } from "@/lib/validation";
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
  await ensureDb();
  const body = await readJsonObject(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ایمیل نامعتبر" }, { status: 400 });
  }

  const user = await getUserByEmail(parsed.data.email);
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

  // Self-hosted / no SMTP: surface the reset link so the owner is not locked out.
  // When SMTP is configured and send succeeds, only the email is used.
  if (!sentViaEmail) {
    return NextResponse.json({
      message: isSmtpConfigured()
        ? `${genericMessage} ارسال ایمیل ناموفق بود؛ از لینک زیر استفاده کن.`
        : `${genericMessage} ایمیل پیکربندی نشده؛ از لینک زیر استفاده کن.`,
      resetUrl,
      sentViaEmail: false,
    });
  }

  return NextResponse.json({
    message: genericMessage,
    sentViaEmail: true,
  });
}
