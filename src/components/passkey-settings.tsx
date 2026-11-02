"use client";
import { useEffect, useRef, useState } from "react";
import { Fingerprint, LoaderCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasskeyProfileFields, EMPTY_PASSKEY_PROFILE } from "@/components/passkey-profile-fields";
import { passkeyRequest, passkeyError } from "@/components/passkey-access";
import { passkeyProfileSchema } from "@/lib/passkey-profile";
import { useAppearance } from "@/components/appearance-provider";
import { toast } from "sonner";
export function PasskeySettings() {
  const [profile, setProfile] = useState(EMPTY_PASSKEY_PROFILE);
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const { gender, setGender } = useAppearance();
  useEffect(() => { const controller = new AbortController(); fetch("/api/profile", { signal: controller.signal }).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => { const parts = (data.name || "").split(" "); setProfile({ firstName: data.firstName || parts[0] || "", lastName: data.lastName || parts.slice(1).join(" ") }); setCount(data.passkeyCount || 0); setReady(true); }).catch(() => {}); return () => controller.abort(); }, []);
  function valid() { return form.current?.reportValidity() && passkeyProfileSchema.safeParse(profile).success; }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!valid()) return toast.error("نام و نام خانوادگی را بررسی کن"); setBusy(true);
    try { const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passkeyProfile: profile }) }); if (!r.ok) throw Error("ذخیره انجام نشد"); toast.success("پروفایلت ذخیره شد"); } catch (e) { toast.error(passkeyError(e)); } finally { setBusy(false); }
  }
  async function addKey() {
    if (!valid()) return toast.error("ابتدا نام و نام خانوادگی را کامل کن"); setBusy(true);
    try { const { startRegistration } = await import("@simplewebauthn/browser"); const { options } = await passkeyRequest({ action: "link_options", profile }); const credential = await startRegistration({ optionsJSON: options }); await passkeyRequest({ action: "link_verify", credential }); setCount(c => c+1); toast.success("کلید ورود این دستگاه به همین حساب اضافه شد"); } catch (e) { toast.error(passkeyError(e)); } finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Fingerprint size={20} />پروفایل و ورود با تأیید دستگاه</CardTitle></CardHeader><CardContent className="space-y-5"><form ref={form} onSubmit={save} className="space-y-5"><PasskeyProfileFields value={profile} onChange={setProfile} disabled={!ready || busy} /><Button type="submit" disabled={!ready || busy}>ذخیره مشخصات</Button></form><div className="space-y-3 border-t pt-4"><p className="text-sm leading-7 text-muted-foreground">{count ? `${count} کلید ورود به حسابت متصل است.` : "با افزودن کلید، دفعهٔ بعد بدون رمز وارد همین حساب می‌شوی."} تصویر چهره یا اثر انگشت به سایت ارسال نمی‌شود.</p><Button type="button" variant="outline" className="min-h-12 gap-2" disabled={!ready || busy || count >= 5} onClick={() => void addKey()}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : <Fingerprint size={18} />}افزودن کلید ورود این دستگاه</Button></div><div className="flex flex-wrap items-center gap-2 border-t pt-4"><span className="text-xs text-muted-foreground">پروفایل سلامت</span>{(["female", "male"] as const).map(value => <Button type="button" key={value} size="sm" variant={gender === value ? "default" : "outline"} aria-pressed={gender === value} onClick={() => void setGender(value).catch(() => toast.error("ذخیره نشد"))}>{value === "female" ? "زن" : "مرد"}</Button>)}</div></CardContent></Card>;
}
