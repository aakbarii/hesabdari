import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

export default function NotFound() {
  return <div className="flex min-h-[65vh] flex-col items-center justify-center gap-5 p-8 text-center">
    <div className="rounded-3xl bg-primary/10 p-6 text-primary"><Compass className="h-12 w-12" /></div>
    <p className="text-sm text-muted-foreground">۴۰۴ · مسیر پیدا نشد</p>
    <h1 className="text-2xl font-semibold tabular-nums">این صفحه در روال وجود ندارد</h1>
    <p className="text-sm text-muted-foreground">از منو مسیر دیگری را انتخاب کنید یا به داشبورد برگردید.</p>
    <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground"><ArrowRight className="h-4 w-4" /> بازگشت به داشبورد</Link>
  </div>;
}
