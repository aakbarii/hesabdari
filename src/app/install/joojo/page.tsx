import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

// Present install metadata in the initial HTML; Safari's install UI must not
// depend on account fetching or a client-side theme update finishing first.
export const metadata: Metadata = {
  title: "نصب با آیکون جوجو",
  manifest: "/joojo/manifest.json?v=4",
  appleWebApp: { capable: true, title: "روال جوجو", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/joojo/stella-icon-192.png?v=4", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/joojo/stella-icon-180.png?v=4", sizes: "180x180", type: "image/png" }],
  },
};

export default function JoojoInstallPage() {
  return <div className="mx-auto max-w-lg space-y-6 p-6 text-center">
    <Image src="/joojo/stella-icon-192.png" alt="آیکون جوجوی صورتی" width={160} height={160} priority className="mx-auto rounded-[36px] shadow-lg border-2 border-border/60" />
    <h1 className="text-2xl font-bold">روال با آیکون جوجو 🎀</h1>
    <p className="text-sm leading-8 text-muted-foreground">این صفحه مخصوص نصب با آیکون جوجوست. در Safari همین صفحه را باز نگه دار، دکمهٔ اشتراک‌گذاری را بزن و «Add to Home Screen» را انتخاب کن. در پیش‌نمایش، تصویر جوجو را بررسی کن و بعد «Add» بزن.</p>

    {/* Showcase of character poses */}
    <div className="rounded-2xl border bg-card/60 p-4 text-center">
      <span className="text-xs font-bold text-foreground block mb-3">حالت‌های مختلف همراه شما در برنامه ♡</span>
      <div className="grid grid-cols-4 gap-2">
        <div className="flex flex-col items-center p-2 rounded-xl bg-background border border-border/50">
          <Image src="/joojo/smiling.png" alt="خندان" width={48} height={48} className="h-12 w-12 object-contain" />
          <span className="text-[10px] text-muted-foreground mt-1 font-medium">خندان</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-xl bg-background border border-border/50">
          <Image src="/joojo/winking.png" alt="بازیگوش" width={48} height={48} className="h-12 w-12 object-contain" />
          <span className="text-[10px] text-muted-foreground mt-1 font-medium">بازیگوش</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-xl bg-background border border-border/50">
          <Image src="/joojo/floating.png" alt="پرواز" width={48} height={48} className="h-12 w-12 object-contain" />
          <span className="text-[10px] text-muted-foreground mt-1 font-medium">پرواز</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-xl bg-background border border-border/50">
          <Image src="/joojo/hatchling.png" alt="پشمالو" width={48} height={48} className="h-12 w-12 object-contain" />
          <span className="text-[10px] text-muted-foreground mt-1 font-medium">پشمالو</span>
        </div>
      </div>
    </div>

    <p className="rounded-2xl border bg-muted/40 p-4 text-sm leading-8">عوض‌کردن تم داخل برنامه، آیکون میان‌بر قبلی آیفون را به‌روز نمی‌کند. برای آیکون جدید، نصب تازه از همین صفحه انجام بده. قبل از حذف نسخهٔ قبلی، از دسترسی به حسابت در Safari مطمئن شو.</p>
    <Link href="/" className="inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">ورود به برنامه</Link>
  </div>;
}
