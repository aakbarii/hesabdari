import { NextResponse } from "next/server";
import { and,desc,eq,gte,lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { selfCareItems,selfCareLogs } from "@/lib/db/schema";
import { ensureDb } from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";
import { readJsonObject } from "@/lib/validation";
import { toISODate } from "@/lib/format";
import { daySchema,addDays } from "@/lib/cycle-tracking";
import { careItemSchema,careLogSchema,CARE_PACKS,CARE_TEMPLATES,careWeek } from "@/lib/selfcare";
import { nanoid } from "@/lib/db/nanoid";
import { z } from "zod";
export async function GET(request:Request){
  await ensureDb();const user=await requireUserId();if(user instanceof NextResponse)return user;
  const date=new URL(request.url).searchParams.get("date")??toISODate(new Date());if(!daySchema.safeParse(date).success)return NextResponse.json({error:"تاریخ نامعتبر"},{status:400});
  const [items,logs]=await Promise.all([db.select().from(selfCareItems).where(eq(selfCareItems.userId,user)).orderBy(desc(selfCareItems.createdAt)).all(),db.select().from(selfCareLogs).where(and(eq(selfCareLogs.userId,user),gte(selfCareLogs.date,addDays(date,-6)),lte(selfCareLogs.date,date))).all()]);
  return NextResponse.json({items,logs,date,week:careWeek(logs,date)},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:Request){
  await ensureDb();const user=await requireUserId();if(user instanceof NextResponse)return user;const body=await readJsonObject(request);
  if(body.action==="seed"){
    const pack=CARE_PACKS.find(pack=>pack.id===body.packId);if(!pack)return NextResponse.json({error:"بسته یافت نشد"},{status:400});
    const commands=CARE_TEMPLATES.filter(item=>pack.items.includes(item.id)).map(item=>db.insert(selfCareItems).values({...item,id:`${user}:care-template:${item.id}`,userId:user,weekdays:"[0,1,2,3,4,5,6]"}).onConflictDoUpdate({target:selfCareItems.id,set:{archived:false}}));
    if(commands.length)await db.batch([commands[0],...commands.slice(1)]);
    return NextResponse.json({success:true});
  }
  if(body.action==="import"){
    const parsed=z.object({days:z.array(z.object({date:daySchema,ids:z.array(z.enum(CARE_TEMPLATES.map(item=>item.id) as [string,...string[]])).max(10)})).min(1).max(90)}).safeParse(body);
    if(!parsed.success)return NextResponse.json({error:"سوابق قدیمی معتبر نیستند؛ حداکثر ۹۰ روز قابل انتقال است"},{status:400});
    const ids=new Set(parsed.data.days.flatMap(day=>day.ids));const templates=CARE_TEMPLATES.filter(item=>ids.has(item.id));
    if(!templates.length)return NextResponse.json({error:"سابقه‌ای برای انتقال نیست"},{status:400});
    const commands=[
      ...templates.map(item=>db.insert(selfCareItems).values({...item,id:`${user}:care-template:${item.id}`,userId:user,weekdays:"[0,1,2,3,4,5,6]"}).onConflictDoNothing()),
      ...parsed.data.days.flatMap(day=>templates.filter(item=>day.ids.includes(item.id)).map(item=>db.insert(selfCareLogs).values({id:`${user}:care-log:${item.id}:${day.date}`,userId:user,itemId:`${user}:care-template:${item.id}`,date:day.date,value:1,targetValue:1,titleSnapshot:item.title,unitSnapshot:"نوبت"}).onConflictDoNothing())),
    ];
    if(commands.length)await db.batch([commands[0],...commands.slice(1)]);
    return NextResponse.json({success:true});
  }
  if(body.action==="log"){
    const parsed=careLogSchema.safeParse(body);if(!parsed.success)return NextResponse.json({error:"مقدار یا تاریخ معتبر نیست"},{status:400});
    const value=parsed.data;
    const item=await db.select().from(selfCareItems).where(and(eq(selfCareItems.id,value.itemId),eq(selfCareItems.userId,user))).get();
    if(!item)return NextResponse.json({error:"برنامه یافت نشد"},{status:404});
    if(item.archived)return NextResponse.json({error:"ابتدا برنامه را از بایگانی برگردان"},{status:409});
    const existing=await db.select().from(selfCareLogs).where(and(eq(selfCareLogs.itemId,item.id),eq(selfCareLogs.date,value.date),eq(selfCareLogs.userId,user))).get();
    await db.insert(selfCareLogs).values({id:existing?.id??`${user}:care-log:${item.id}:${value.date}`,userId:user,itemId:item.id,date:value.date,value:value.value,notes:value.notes??null,targetValue:item.targetValue,titleSnapshot:item.title,unitSnapshot:item.unit}).onConflictDoUpdate({target:[selfCareLogs.itemId,selfCareLogs.date],set:{value:value.value,notes:value.notes??null,updatedAt:new Date()}}).run();
    return NextResponse.json({success:true});
  }
  const parsed=careItemSchema.safeParse(body);if(!parsed.success)return NextResponse.json({error:"عنوان، هدف یا روزهای برنامه معتبر نیستند"},{status:400});
  const {id,weekdays,...value}=parsed.data;
  if(id){const existing=await db.select().from(selfCareItems).where(and(eq(selfCareItems.id,id),eq(selfCareItems.userId,user))).get();if(!existing)return NextResponse.json({error:"برنامه یافت نشد"},{status:404});await db.update(selfCareItems).set({...value,weekdays:JSON.stringify(weekdays)}).where(and(eq(selfCareItems.id,id),eq(selfCareItems.userId,user))).run();}
  else await db.insert(selfCareItems).values({id:nanoid(),userId:user,...value,weekdays:JSON.stringify(weekdays)}).run();
  return NextResponse.json({success:true});
}
export async function PATCH(request:Request){
  await ensureDb();const user=await requireUserId();if(user instanceof NextResponse)return user;const body=await readJsonObject(request);
  if(typeof body.id!=="string"||typeof body.archived!=="boolean")return NextResponse.json({error:"درخواست نامعتبر"},{status:400});
  const existing=await db.select().from(selfCareItems).where(and(eq(selfCareItems.id,body.id),eq(selfCareItems.userId,user))).get();if(!existing)return NextResponse.json({error:"برنامه یافت نشد"},{status:404});
  await db.update(selfCareItems).set({archived:body.archived}).where(and(eq(selfCareItems.id,body.id),eq(selfCareItems.userId,user))).run();return NextResponse.json({success:true});
}
