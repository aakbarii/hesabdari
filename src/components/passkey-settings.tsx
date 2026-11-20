"use client";
import { useEffect, useRef, useState } from "react";
import { Fingerprint, LoaderCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasskeyProfileFields, EMPTY_PASSKEY_PROFILE } from "@/components/passkey-profile-fields";
import { passkeyRequest, passkeyError } from "@/components/passkey-access";
import { passkeyProfileSchema } from "@/lib/passkey-profile";
import { useAppearance } from "@/components/appearance-provider";
import { toast } from "sonner";
export function PasskeySettings() {
  const [profile, setProfile] = useState(EMPTY_PASSKEY_PROFILE);
  const [count, setCount] = useState(0);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const { gender, setGender } = useAppearance();
  useEffect(() => { const controller = new AbortController(); fetch("/api/profile", { signal: controller.signal }).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => { const parts = (data.name || "").split(" "); setProfile({ firstName: data.firstName || parts[0] || "", lastName: data.lastName || parts.slice(1).join(" "), phone: data.phone ?? undefined }); setCount(data.passkeyCount || 0); setPasswordEnabled(data.passwordEnabled === true); setReady(true); }).catch(() => {}); return () => controller.abort(); }, []);
  function valid() { return form.current?.reportValidity() && passkeyProfileSchema.safeParse(profile).success; }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!valid()) return toast.error("نام و نام خانوادگی را بررسی کن"); setBusy(true);
    try { const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passkeyProfile: profile }) }); if (!r.ok) throw Error("ذخیره انجام نشد"); toast.success("پروفایلت ذخیره شد"); } catch (e) { toast.error(passkeyError(e)); } finally { setBusy(false); }
  }
  async function addKey() {
    if (!valid()) return toast.error("ابتدا نام و نام خانوادگی را کامل کن"); setBusy(true);
    try { const { startRegistration } = await import("@simplewebauthn/browser"); const { options } = await passkeyRequest({ action: "link_options", profile }); const credential = await startRegistration({ optionsJSON: options }); await passkeyRequest({ action: "link_verify", credential }); setCount(c => c+1); toast.success("کلید ورود این دستگاه به همین حساب اضافه شد"); } catch (e) { toast.error(passkeyError(e)); } finally { setBusy(false); }
  }
  async function changePassword(remove = false) {
    if (passwordEnabled && !currentPassword) return toast.error("رمز فعلی را وارد کن");
    if (!remove && (Array.from(newPassword).length < 12 || new TextEncoder().encode(newPassword).length > 72)) {
      return toast.error("رمز جدید باید دست‌کم ۱۲ نویسه و حداکثر ۷۲ بایت باشد");
    }
    if (!remove && newPassword !== confirmPassword) return toast.error("تکرار رمز با رمز جدید یکی نیست");
    setBusy(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const { options } = await passkeyRequest({ action: "password_options" });
      const credential = await startAuthentication({ optionsJSON: options });
      const result = await passkeyRequest({
        action: "password_verify",
        credential,
        password: currentPassword || undefined,
        newPassword: remove ? null : newPassword,
      });
      setPasswordEnabled(result.passwordEnabled === true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(remove ? "رمز اضافه برداشته شد" : "رمز اضافه ذخیره شد");
    } catch (error) {
      toast.error(passkeyError(error));
    } finally {
      setBusy(false);
    }
  }
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Fingerprint size={20} />پروفایل و ورود با تأیید دستگاه</CardTitle></CardHeader><CardContent className="space-y-5"><form ref={form} onSubmit={save} className="space-y-5"><PasskeyProfileFields value={profile} onChange={setProfile} disabled={!ready || busy} /><Button type="submit" disabled={!ready || busy}>ذخیره مشخصات</Button></form><div className="space-y-3 border-t pt-4"><p className="text-sm leading-7 text-muted-foreground">{count ? `${count} کلید ورود به حسابت متصل است.` : "با افزودن کلید، دفعهٔ بعد بدون رمز وارد همین حساب می‌شوی."} تصویر چهره یا اثر انگشت به سایت ارسال نمی‌شود.</p><Button type="button" variant="outline" className="min-h-12 gap-2" disabled={!ready || busy || count >= 5} onClick={() => void addKey()}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : <Fingerprint size={18} />}افزودن کلید ورود این دستگاه</Button></div><form className="space-y-3 border-t pt-4" onSubmit={event => { event.preventDefault(); void changePassword(); }}>
    <h3 className="text-sm font-semibold">رمز اضافه برای ورود</h3>
    <p className="text-sm leading-7 text-muted-foreground">اختیاری است. بعد از فعال‌کردن، برای ورود هم کلید دستگاه و هم این رمز لازم است.</p>
    {passwordEnabled && <label className="block space-y-2 text-sm">
      <span>رمز فعلی</span>
      <Input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} disabled={busy} maxLength={72} required />
    </label>}
    <label className="block space-y-2 text-sm">
      <span>رمز جدید</span>
      <Input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} disabled={!ready || busy || !count} maxLength={72} minLength={12} required />
    </label>
    <label className="block space-y-2 text-sm">
      <span>تکرار رمز جدید</span>
      <Input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} disabled={!ready || busy || !count} maxLength={72} required />
    </label>
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={!ready || busy || !count}>{passwordEnabled ? "تغییر رمز با تأیید دستگاه" : "افزودن رمز با تأیید دستگاه"}</Button>
      {passwordEnabled && <Button type="button" variant="outline" disabled={busy || !count} onClick={() => void changePassword(true)}>برداشتن رمز</Button>}
    </div>
  </form><div className="flex flex-wrap items-center gap-2 border-t pt-4"><span className="text-xs text-muted-foreground">پروفایل سلامت</span>{(["female", "male"] as const).map(value => <Button type="button" key={value} size="sm" variant={gender === value ? "default" : "outline"} aria-pressed={gender === value} onClick={() => void setGender(value).catch(() => toast.error("ذخیره نشد"))}>{value === "female" ? "زن" : "مرد"}</Button>)}</div></CardContent></Card>;
}
