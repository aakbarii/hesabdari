import nodemailer from "nodemailer";

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<boolean> {
  if (!isSmtpConfigured()) return false;

  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html: html ?? text.replace(/\n/g, "<br>"),
    });
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("SMTP send failed:", error);
    }
    return false;
  }
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const subject = "بازیابی رمز عبور — حسابداری شخصی";
  const text =
    `سلام ${name},\n\n` +
    `درخواست بازیابی رمز عبور برای حساب شما ثبت شد.\n\n` +
    `لینک بازیابی (۱ ساعت معتبر):\n${resetUrl}\n\n` +
    `اگر این درخواست را شما نداده‌اید، این ایمیل را نادیده بگیرید.`;

  const html =
    `<p>سلام <strong>${name}</strong>,</p>` +
    `<p>درخواست بازیابی رمز عبور برای حساب شما ثبت شد.</p>` +
    `<p><a href="${resetUrl}">بازیابی رمز عبور</a></p>` +
    `<p style="color:#666;font-size:12px">این لینک ۱ ساعت معتبر است.</p>`;

  return sendEmail(to, subject, text, html);
}

export function buildResetUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
}
