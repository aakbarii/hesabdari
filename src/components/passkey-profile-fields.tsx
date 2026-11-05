"use client";
import type { PasskeyProfile } from "@/lib/passkey-profile";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/locale-provider";
import { Label } from "@/components/ui/label";
export const EMPTY_PASSKEY_PROFILE: PasskeyProfile = { firstName: "", lastName: "" };
export function PasskeyProfileFields({ value, onChange, disabled = false, requirePhone = false }: { value: PasskeyProfile; onChange: (value: PasskeyProfile) => void; disabled?: boolean; requirePhone?: boolean }) {
  const en = useLocale().locale === "en";
  return <fieldset disabled={disabled} className="grid min-w-0 grid-cols-2 gap-3">
    <div className="min-w-0 space-y-2"><Label htmlFor="pk-first-name">{en ? "First name" : "نام"}</Label><Input id="pk-first-name" autoComplete="given-name" maxLength={50} value={value.firstName} onChange={e => onChange({ ...value, firstName: e.target.value })} required className="h-12" /></div>
    <div className="min-w-0 space-y-2"><Label htmlFor="pk-last-name">{en ? "Last name" : "نام خانوادگی"}</Label><Input id="pk-last-name" autoComplete="family-name" maxLength={50} value={value.lastName} onChange={e => onChange({ ...value, lastName: e.target.value })} required className="h-12" /></div>
    <div className="col-span-2 min-w-0 space-y-2">
      <Label htmlFor="pk-phone">{en ? "Mobile number" : "شماره موبایل"}</Label>
      <Input id="pk-phone" type="tel" autoComplete="tel" dir="ltr" maxLength={32} placeholder="09123456789" value={value.phone ?? ""} onChange={e => onChange({ ...value, phone: e.target.value || undefined })} required={requirePhone} className="h-12" />
    </div>
  </fieldset>;
}
