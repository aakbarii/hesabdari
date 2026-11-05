import { z } from "zod";
const personName = z.string().trim().min(1).max(50).regex(/^[\p{L}\p{M} '\u200c-]+$/u);
const phone = z.string().trim().max(32).transform(value => value
  .replace(/[۰-۹٠-٩]/g, digit => String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(digit) % 10))
  .replace(/[ ()-]/g, "")
  .replace(/^0098/, "+98")
  .replace(/^09/, "+989"))
  .pipe(z.string().regex(/^\+[1-9][0-9]{7,14}$/));
export const passkeyProfileSchema = z.object({ firstName: personName, lastName: personName, phone: phone.optional() }).strict();
export const passkeySignupSchema = passkeyProfileSchema.required({ phone: true });
export type PasskeyProfile = z.infer<typeof passkeyProfileSchema>;
