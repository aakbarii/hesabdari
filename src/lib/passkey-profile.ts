import { z } from "zod";

export const PROFILE_AVATARS = ["classic", "reloaded", "journey", "dreamblast", "movie", "summermadness"] as const;
export function normalizePhone(value: string) {
  const digits = value.replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[\s()-]/g, "");
  if (digits.startsWith("+98")) return "0" + digits.slice(3);
  if (digits.startsWith("0098")) return "0" + digits.slice(4);
  return digits;
}
const personName = z.string().trim().min(1).max(50).regex(/^[\p{L}\p{M} '\u200c-]+$/u);
export const passkeyProfileSchema = z.object({
  firstName: personName,
  lastName: personName,
  phone: z.string().max(32).transform(normalizePhone).pipe(z.string().regex(/^09\d{9}$/)),
  avatarId: z.enum(PROFILE_AVATARS),
}).strict();
export type PasskeyProfile = z.infer<typeof passkeyProfileSchema>;
