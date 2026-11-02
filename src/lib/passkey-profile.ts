import { z } from "zod";
const personName = z.string().trim().min(1).max(50).regex(/^[\p{L}\p{M} '\u200c-]+$/u);
export const passkeyProfileSchema = z.object({ firstName: personName, lastName: personName }).strict();
export type PasskeyProfile = z.infer<typeof passkeyProfileSchema>;
