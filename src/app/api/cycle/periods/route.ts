import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { periodRecords, cycleEntries } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/queries";
import { getPeriods } from "@/lib/db/cycle-tracking";
import { periodSchema } from "@/lib/cycle-tracking";
import { requireUserId } from "@/lib/api-auth";
import { readJsonObject } from "@/lib/validation";
import { nanoid } from "@/lib/db/nanoid";
export async function POST(request: Request) {
  await ensureDb(); const user = await requireUserId(); if (user instanceof NextResponse) return user;
  const parsed = periodSchema.safeParse(await readJsonObject(request));
  if (!parsed.success) return NextResponse.json({error:"تاریخ‌ها یا اطلاعات دوره معتبر نیستند"},{status:400});
  const value = parsed.data;
  const { periods, archived } = await getPeriods(user);
  const all = [...periods,...archived];
  const original = value.id ? all.find(period => period.id === value.id) : null;
  if (value.id && !original) return NextResponse.json({error:"دوره یافت نشد"},{status:404});
  if (all.some(period => period.id !== value.id && period.startDate === value.startDate)) return NextResponse.json({error:"دوره‌ای با همین تاریخ شروع وجود دارد؛ همان مورد را ویرایش یا بازیابی کن"},{status:409});
  if (periods.some(period => period.id !== value.id && value.startDate <= (period.endDate ?? period.startDate) && (value.endDate ?? value.startDate) >= period.startDate)) return NextResponse.json({error:"تاریخ‌های این دوره با یک دورهٔ ثبت‌شده هم‌پوشانی دارند"},{status:409});
  const legacyStartId = original?.legacyStartId ?? null;
  const values = { userId:user, startDate:value.startDate,endDate:value.endDate ?? null,notes:value.notes ?? null,legacyStartId,archived:false };
  if (original && !original.id.startsWith("legacy:")) await db.update(periodRecords).set(values).where(and(eq(periodRecords.id,original.id),eq(periodRecords.userId,user))).run();
  else await db.insert(periodRecords).values({id:legacyStartId ? `${user}:legacy-period:${legacyStartId}` : nanoid(),...values}).run();
  return NextResponse.json({success:true});
}
export async function PATCH(request: Request) {
  await ensureDb(); const user = await requireUserId(); if (user instanceof NextResponse) return user;
  const body = await readJsonObject(request);
  if (typeof body.id !== "string" || typeof body.archived !== "boolean") return NextResponse.json({error:"درخواست نامعتبر"},{status:400});
  if (body.id.startsWith("legacy:")) {
    const original = await db.select().from(cycleEntries).where(and(eq(cycleEntries.id,body.id.slice(7)),eq(cycleEntries.userId,user),eq(cycleEntries.kind,"period_start"))).get();
    if (!original) return NextResponse.json({error:"دوره یافت نشد"},{status:404});
    const { periods } = await getPeriods(user); const period = periods.find(period => period.id === body.id);
    if (!period) return NextResponse.json({error:"دوره یافت نشد"},{status:404});
    await db.insert(periodRecords).values({id:`${user}:legacy-period:${original.id}`,userId:user,startDate:period.startDate,endDate:period.endDate,notes:period.notes,legacyStartId:original.id,archived:body.archived}).onConflictDoUpdate({target:periodRecords.id,set:{archived:body.archived}}).run();
  } else {
    const original = await db.select().from(periodRecords).where(and(eq(periodRecords.id,body.id),eq(periodRecords.userId,user))).get();
    if (!original) return NextResponse.json({error:"دوره یافت نشد"},{status:404});
    if (!body.archived) {
      const { periods } = await getPeriods(user);
      if (periods.some(period => period.id !== original.id && original.startDate <= (period.endDate ?? period.startDate) && (original.endDate ?? original.startDate) >= period.startDate)) return NextResponse.json({error:"پیش از بازیابی، هم‌پوشانی تاریخ‌ها را اصلاح کن"},{status:409});
    }
    await db.update(periodRecords).set({archived:body.archived}).where(and(eq(periodRecords.id,body.id),eq(periodRecords.userId,user))).run();
  }
  return NextResponse.json({success:true});
}
