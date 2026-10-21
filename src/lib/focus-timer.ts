import { z } from "zod";
export const focusPayloadSchema = z.object({
  clientId: z.string().uuid(), taskName: z.string().trim().min(1).max(200),
  durationMinutes: z.number().int().min(1).max(240),
  category: z.enum(["work", "study", "coding", "personal"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type FocusPayload = z.infer<typeof focusPayloadSchema>;
export const timerSchema = z.object({ mode: z.enum(["work", "shortBreak", "longBreak"]), duration: z.number().int().min(1).max(240), remaining: z.number().int().min(0).max(14400), deadline: z.number().finite().positive().nullable(), payload: focusPayloadSchema.nullable(), pending: z.boolean() });
export type FocusTimer = z.infer<typeof timerSchema>;
export function remainingSeconds(deadline: number, now: number = Date.now()) { return Math.max(0, Math.ceil((deadline - now) / 1000)); }
