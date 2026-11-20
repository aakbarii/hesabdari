"use client";
import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasskeyProfileFields, EMPTY_PASSKEY_PROFILE } from "@/components/passkey-profile-fields";
import { passkeyProfileSchema } from "@/lib/passkey-profile";
import { useAppearance } from "@/components/appearance-provider";
import { toast } from "sonner";
export function AccountProfile() {
  const [profile, setProfile] = useState(EMPTY_PASSKEY_PROFILE);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const { gender, setGender } = useAppearance();
  useEffect(() => { const controller = new AbortController(); fetch("/api/profile", { signal: controller.signal }).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => { const parts = (data.name || "").split(" "); setProfile({ firstName: data.firstName || parts[0] || "", lastName: data.lastName || parts.slice(1).join(" "), phone: data.phone ?? undefined }); setReady(true); }).catch(() => {}); return () => controller.abort(); }, []);
  function valid() { return form.current?.reportValidity() && passkeyProfileSchema.safeParse(profile).success; }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!valid()) return toast.error("نام و نام خانوادگی را بررسی کن"); setBusy(true);
    try { const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passkeyProfile: profile }) }); if (!r.ok) throw Error("ذخیره انجام نشد"); toast.success("پروفایلت ذخیره شد"); } catch (e) { toast.error(e instanceof Error ? e.message : "ذخیره نشد"); } finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>پروفایل حساب</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <form ref={form} onSubmit={save} className="space-y-5">
          <PasskeyProfileFields value={profile} onChange={setProfile} disabled={!ready || busy} />
          <Button type="submit" disabled={!ready || busy}>ذخیره مشخصات</Button>
        </form>
        <div className="flex flex-wrap items-center gap-2 border-t pt-4"><span className="text-xs text-muted-foreground">پروفایل سلامت</span>{(["female", "male"] as const).map(value => <Button type="button" key={value} size="sm" variant={gender === value ? "default" : "outline"} aria-pressed={gender === value} onClick={() => void setGender(value).catch(() => toast.error("ذخیره نشد"))}>{value === "female" ? "زن" : "مرد"}</Button>)}</div>
      </CardContent>
    </Card>
  );
}
