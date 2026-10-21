import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

// Present install metadata in the initial HTML; Safari's install UI must not
// depend on account fetching or a client-side theme update finishing first.
export const metadata: Metadata = {
  title: "نصب با آیکون جوجو",
  manifest: "/joojo/manifest.json?v=2",
  appleWebApp: { capable: true, title: "روال جوجو", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/joojo/icon-192.png?v=2", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/joojo/icon-180.png?v=2", sizes: "180x180", type: "image/png" }],
  },
};

export default function JoojoInstallPage() {
  return <div className="mx-auto max-w-lg space-y-6 p-6 text-center">
    <Image src="/joojo/logo.webp" alt="آیکون جوجوی پاپیون‌صورتی" width={160} height={160} priority className="mx-auto rounded-[36px] shadow-lg" />
    <h1 className="text-2xl font-bold">روال با آیکون جوجو 🎀</h1>
    <p className="text-sm leading-8 text-muted-foreground">این صفحه مخصوص نصب با آیکون جوجوست. در Safari همین صفحه را باز نگه دار، دکمهٔ اشتراک‌گذاری را بزن و «Add to Home Screen» را انتخاب کن. در پیش‌نمایش، تصویر جوجو را بررسی کن و بعد «Add» بزن.</p>
    <p className="rounded-2xl border bg-muted/40 p-4 text-sm leading-8">عوض‌کردن تم داخل برنامه، آیکون میان‌بر قبلی آیفون را به‌روز نمی‌کند. برای آیکون جدید، نصب تازه از همین صفحه انجام بده. قبل از حذف نسخهٔ قبلی، از دسترسی به حسابت در Safari مطمئن شو.</p>
    <Link href="/" className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">ورود به برنامه</Link>
  </div>;
}
