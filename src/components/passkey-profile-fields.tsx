"use client";
import Image from "next/image";
import { PROFILE_AVATARS, type PasskeyProfile } from "@/lib/passkey-profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
export const EMPTY_PASSKEY_PROFILE: PasskeyProfile = { firstName: "", lastName: "", phone: "", avatarId: "classic" };
export function PasskeyProfileFields({ value, onChange, disabled = false }: { value: PasskeyProfile; onChange: (value: PasskeyProfile) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="min-w-0 space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="min-w-0 space-y-2"><Label htmlFor="pk-first-name">نام</Label><Input id="pk-first-name" autoComplete="given-name" maxLength={50} value={value.firstName} onChange={e => onChange({ ...value, firstName: e.target.value })} required className="h-12" /></div>
      <div className="min-w-0 space-y-2"><Label htmlFor="pk-last-name">نام خانوادگی</Label><Input id="pk-last-name" autoComplete="family-name" maxLength={50} value={value.lastName} onChange={e => onChange({ ...value, lastName: e.target.value })} required className="h-12" /></div>
    </div>
    <div className="space-y-2"><Label htmlFor="pk-phone">شماره تماس</Label><Input id="pk-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="0912 345 6789" maxLength={32} value={value.phone} onChange={e => onChange({ ...value, phone: e.target.value })} required className="h-12 text-left" /></div>
    <div className="space-y-2"><p id="pk-avatar-label" className="text-sm font-medium">عکس پروفایلت را انتخاب کن</p><div role="group" aria-labelledby="pk-avatar-label" className="grid grid-cols-3 gap-2 sm:grid-cols-6">{PROFILE_AVATARS.map((id, index) => <button key={id} type="button" aria-label={`عکس پروفایل ${index+1}`} aria-pressed={value.avatarId === id} onClick={() => onChange({ ...value, avatarId: id })} className={cn("flex min-h-16 items-center justify-center rounded-2xl border bg-background/70 transition-colors", value.avatarId === id && "border-primary bg-primary/10 ring-2 ring-primary/20")}><Image src={`/joojo/stella-${id}.webp`} alt="" width={48} height={48} className="h-12 w-12 object-contain" /></button>)}</div></div>
  </fieldset>;
}
