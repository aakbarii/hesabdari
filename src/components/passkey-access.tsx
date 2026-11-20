"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fingerprint, LoaderCircle } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasskeyProfileFields, EMPTY_PASSKEY_PROFILE } from "@/components/passkey-profile-fields";
import { passkeySignupSchema } from "@/lib/passkey-profile";
import { useLocale } from "@/components/locale-provider";
import { toast } from "sonner";

export async function passkeyRequest(body: object) {
  const response = await fetch("/api/auth/passkey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "ورود انجام نشد");
  return data;
}
export function passkeyError(error: unknown) {
  if (error instanceof Error && ["NotAllowedError", "AbortError"].includes(error.name)) return "تأیید دستگاه کامل نشد؛ هر وقت آماده بودی دوباره بزن.";
  if (error instanceof Error && error.name === "InvalidStateError") return "این دستگاه قبلاً کلید ساخته؛ از دکمهٔ ورود استفاده کن.";
  return error instanceof Error ? error.message : "تأیید دستگاه انجام نشد";
}
const subscribeSupport = () => () => {};
export function PasskeyAccess({ register = false, returnPath = "/" }: { register?: boolean; returnPath?: string }) {
  const router = useRouter();
  const { locale, loaded, hasPreference, setLocale } = useLocale();
  const en = locale === "en";
  const [profile, setProfile] = useState(EMPTY_PASSKEY_PROFILE);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const supported = useSyncExternalStore(subscribeSupport, () => window.isSecureContext && typeof window.PublicKeyCredential !== "undefined", () => null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal }).then(r => r.json()).then(d => { if (d.user) router.replace(returnPath); }).catch(() => {});
    return () => controller.abort();
  }, [router, returnPath]);
  const profileError = en ? "Enter your first name, last name and a valid mobile number." : "نام، نام خانوادگی و شماره موبایل معتبر را وارد کن.";
  function done() { toast.success(en ? "Welcome 🌸" : "خوش آمدی 🌸"); router.replace(returnPath); router.refresh(); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (register && !passkeySignupSchema.safeParse(profile).success) { setError(profileError); return; }
    setBusy(true);
    try {
      const { startRegistration, startAuthentication } = await import("@simplewebauthn/browser");
      const { options } = await passkeyRequest({ action: register ? "register_options" : "login_options", ...(register ? { profile, locale } : {}) });
      const credential = register ? await startRegistration({ optionsJSON: options }) : await startAuthentication({ optionsJSON: options });
      await passkeyRequest(register
        ? { action: "register_verify", credential }
        : { action: "login_verify", credential, password: password || undefined });
      done();
    } catch (err) { setError(passkeyError(err)); }
    finally { setBusy(false); }
  }
  if (!loaded) return null;
  if (!hasPreference) return <div className="grid min-h-dvh place-items-center bg-background p-4">
    <section className="w-full max-w-sm space-y-5 rounded-3xl border bg-card p-6 text-center shadow-sm">
      <AppLogo size="xl" showText={false} clickable={false} />
      <h1 className="text-xl font-semibold">زبان را انتخاب کن</h1>
      <p lang="en" dir="ltr" className="text-sm text-muted-foreground">Choose your language</p>
      <div className="grid grid-cols-2 gap-3">
        <Button className="min-h-12" lang="fa" onClick={() => void setLocale("fa")}>فارسی</Button>
        <Button className="min-h-12" lang="en" variant="outline" onClick={() => void setLocale("en")}>English</Button>
      </div>
    </section>
  </div>;
  return <div className="flex min-h-dvh items-center justify-center bg-background p-4 py-8">
    <section className="w-full max-w-md space-y-6 rounded-[28px] border bg-card/95 p-6 shadow-sm sm:p-8" aria-labelledby="access-title">
      <div className="space-y-3 text-center"><AppLogo size="xl" showText={false} clickable={false} /><h1 id="access-title" className="text-2xl font-semibold">{en ? (register ? "Welcome to Hesabdari" : "Welcome back") : (register ? "ساخت حساب حسابداری" : "خوش برگشتی")}</h1><p className="text-sm leading-7 text-muted-foreground">{en ? (register ? "Enter your profile and create a passkey." : "Sign in with your passkey. Enter your extra password if you enabled one.") : register ? "مشخصاتت را وارد کن و کلید ورود بساز." : "با کلید ورود وارد شو. اگر رمز اضافه فعال کرده‌ای، آن را هم وارد کن."}</p></div>
      <div className="grid grid-cols-2 rounded-2xl bg-muted p-1 text-center text-sm"><Link aria-current={!register ? "page" : undefined} href={`/login?from=${encodeURIComponent(returnPath)}`} className={`rounded-xl px-3 py-3 ${!register ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{en ? "Sign in" : "ورود"}</Link><Link aria-current={register ? "page" : undefined} href={`/register?from=${encodeURIComponent(returnPath)}`} className={`rounded-xl px-3 py-3 ${register ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{en ? "Create account" : "ساخت حساب"}</Link></div>
      <form onSubmit={submit} className="space-y-5">
        {register ? (
          <PasskeyProfileFields value={profile} onChange={setProfile} disabled={busy} requirePhone />
        ) : (
          <label className="block space-y-2 text-sm">
            <span>{en ? "Extra password (if enabled)" : "رمز اضافه (اگر فعال کرده‌ای)"}</span>
            <Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} maxLength={72} disabled={busy} />
          </label>
        )}
        {error && <p role="alert" className="text-sm leading-7 text-destructive">{error}</p>}
        {supported === false && <p role="status" className="text-sm text-muted-foreground">{en ? "Open Hesabdari on a browser that supports passkeys." : "حسابداری را در مرورگری باز کن که از کلید ورود پشتیبانی کند."}</p>}
        <Button type="submit" disabled={busy || supported !== true} className="min-h-12 w-full gap-2">
          {busy ? <LoaderCircle className="animate-spin" size={20} /> : <Fingerprint size={20} />}
          {en ? (register ? "Create a passkey" : "Sign in with passkey") : register ? "ساخت حساب با کلید ورود" : "ورود با کلید ورود"}
        </Button>
      </form>
      <p className="text-center text-xs leading-6 text-muted-foreground">{en ? "Your device may ask for Face ID, a fingerprint or your screen lock. Your biometric data stays on your device." : "گوشی ممکن است Face ID، اثر انگشت یا قفل دستگاه را پیشنهاد دهد. اطلاعات بیومتریک در دستگاهت می‌ماند."}</p>
    </section>
  </div>;
}
