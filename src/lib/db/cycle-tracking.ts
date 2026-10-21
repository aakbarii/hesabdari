import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { cycleEntries, periodRecords } from "./schema";
import { legacyPeriods } from "@/lib/cycle-tracking";
export async function getPeriods(userId: string) {
  const [stored, legacy] = await Promise.all([
    db.select().from(periodRecords).where(eq(periodRecords.userId,userId)).orderBy(desc(periodRecords.startDate)).all(),
    db.select().from(cycleEntries).where(eq(cycleEntries.userId,userId)).orderBy(desc(cycleEntries.date)).all(),
  ]);
  const shadowed = new Set(stored.map(record => record.legacyStartId).filter((id): id is string => Boolean(id)));
  const periods = [...stored.filter(period => !period.archived), ...legacyPeriods(legacy,shadowed)].sort((a,b) => b.startDate.localeCompare(a.startDate));
  return { periods, archived: stored.filter(period => period.archived), legacy };
}
