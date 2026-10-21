import { z } from "zod";
import { dateInput } from "./validation";
export const daySchema = dateInput.refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value));
export function addDays(day: string, amount: number) { const date = new Date(day + "T12:00:00Z"); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); }
export function daysBetween(from: string, to: string) { return Math.round((Date.parse(to + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) / 86400000); }
export const periodSchema = z.object({ id: z.string().optional(), startDate: daySchema, endDate: daySchema.nullable().optional(), notes: z.string().max(20000).nullable().optional() }).refine(value => !value.endDate || value.endDate >= value.startDate, "پایان دوره نمی‌تواند پیش از شروع باشد");
export const dailyCycleSchema = z.object({ date: daySchema, flow: z.enum(["none", "spotting", "light", "medium", "heavy"]), pain: z.number().int().min(0).max(10), mood: z.enum(["great", "good", "neutral", "tired", "bad"]), symptoms: z.array(z.string().min(1).max(50)).max(30), notes: z.string().max(20000).nullable().optional() });
export type Period = { id: string; startDate: string; endDate: string | null; notes: string | null; legacyStartId?: string | null; archived?: boolean };
export function legacyPeriods(entries: { id: string; date: string; kind: string; notes: string | null }[], shadowed: Set<string>) : Period[] {
  const starts = [...new Map(entries.filter(entry => entry.kind === "period_start").sort((a,b) => a.id.localeCompare(b.id)).map(entry => [entry.date, entry])).values()].sort((a,b) => a.date.localeCompare(b.date));
  return starts.filter(start => !shadowed.has(start.id)).map(start => {
    const next = starts.find(other => other.date > start.date);
    const end = entries.filter(entry => entry.kind === "period_end" && entry.date >= start.date && (!next || entry.date < next.date)).sort((a,b) => a.date.localeCompare(b.date))[0];
    return { id: `legacy:${start.id}`, startDate: start.date, endDate: end?.date ?? null, notes: [start.notes, end?.notes].filter(Boolean).join("\n") || null, legacyStartId: start.id };
  });
}
export function cycleSummary(periods: Period[], today: string, fallbackLength: number) {
  const sorted = periods.filter(period => !period.archived).sort((a,b) => a.startDate.localeCompare(b.startDate));
  const intervals = sorted.slice(1).map((period,index) => daysBetween(sorted[index].startDate, period.startDate)).filter(value => value > 0).slice(-6);
  const average = intervals.length ? Math.round(intervals.reduce((sum,value) => sum + value, 0) / intervals.length) : fallbackLength;
  const completed = sorted.filter(period => period.endDate);
  const averagePeriod = completed.length ? Math.round(completed.reduce((sum,period) => sum + daysBetween(period.startDate, period.endDate!) + 1, 0) / completed.length * 10) / 10 : null;
  const latest = sorted.filter(period => period.startDate <= today).at(-1);
  return { count: sorted.length, intervals, average, averagePeriod, cycleDay: latest ? daysBetween(latest.startDate, today) + 1 : null,
    ongoing: latest && (!latest.endDate || latest.endDate >= today) ? latest : null,
    nextEstimate: latest ? addDays(latest.startDate, average) : null,
    estimateFrom: latest ? addDays(latest.startDate, intervals.length >= 2 ? Math.min(...intervals) : average) : null,
    estimateTo: latest ? addDays(latest.startDate, intervals.length >= 2 ? Math.max(...intervals) : average) : null };
}
