import { z } from "zod";

/** Reject invalid calendar dates before they reach SQLite timestamp columns. */
export const dateInput = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return false;
  const day = value.slice(0, 10);
  const parsed = new Date(day + "T00:00:00.000Z");
  return Number.isFinite(Date.parse(value)) &&
    Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}, "تاریخ نامعتبر است");

export const moneyInput = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

/** Let each route's schema report malformed JSON as a normal validation error. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}
