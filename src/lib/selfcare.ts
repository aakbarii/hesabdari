import { z } from "zod";
import { daySchema, addDays } from "./cycle-tracking";
export const CARE_CATEGORIES: Record<string,string> = {body:"بدن و مراقبت",mind:"ذهن و آرامش",space:"محیط و نظم",connection:"ارتباط",personal:"شخصی"};
export const CARE_TIMES: Record<string,string> = {morning:"صبح",evening:"شب",anytime:"هر زمان"};
export const careItemSchema = z.object({id:z.string().optional(),title:z.string().trim().min(1).max(100),description:z.string().max(2000).nullable().optional(),category:z.enum(["body","mind","space","connection","personal"]),timeOfDay:z.enum(["morning","evening","anytime"]),weekdays:z.array(z.number().int().min(0).max(6)).min(1).max(7).transform(values=>[...new Set(values)]),targetValue:z.number().min(.1).max(100000),unit:z.string().trim().min(1).max(30)});
export const careLogSchema = z.object({itemId:z.string().min(1),date:daySchema,value:z.number().min(0).max(1000000),notes:z.string().max(10000).nullable().optional()});
export const CARE_TEMPLATES = [
  {id:"cleanser",title:"پاک‌سازی پوست",category:"body",timeOfDay:"evening",targetValue:1,unit:"نوبت"},
  {id:"moisturizer",title:"مرطوب‌کننده",category:"body",timeOfDay:"evening",targetValue:1,unit:"نوبت"},
  {id:"sunscreen",title:"ضدآفتاب خودم",category:"body",timeOfDay:"morning",targetValue:1,unit:"نوبت"},
  {id:"hair",title:"مراقبت مو",category:"body",timeOfDay:"anytime",targetValue:1,unit:"نوبت"},
  {id:"water",title:"پیگیری آب طبق برنامهٔ خودم",category:"body",timeOfDay:"anytime",targetValue:1,unit:"نوبت"},
  {id:"stretch",title:"زمان حرکت و کشش خودم",category:"body",timeOfDay:"anytime",targetValue:1,unit:"نوبت"},
  {id:"journal",title:"نوشتن برای خودم",category:"mind",timeOfDay:"evening",targetValue:5,unit:"دقیقه"},
  {id:"screen",title:"استراحت از صفحه",category:"mind",timeOfDay:"anytime",targetValue:1,unit:"نوبت"},
  {id:"tea",title:"زمان آرامش بدون حواس‌پرتی",category:"mind",timeOfDay:"evening",targetValue:10,unit:"دقیقه"},
  {id:"sleep",title:"آماده‌سازی محیط خواب",category:"mind",timeOfDay:"evening",targetValue:1,unit:"نوبت"},
  {id:"space",title:"مرتب‌کردن یک بخش کوچک",category:"space",timeOfDay:"evening",targetValue:5,unit:"دقیقه"},
  {id:"plan",title:"نوشتن اولویت امروز",category:"personal",timeOfDay:"morning",targetValue:1,unit:"نوبت"},
  {id:"connection",title:"گفت‌وگو با یک عزیز",category:"connection",timeOfDay:"anytime",targetValue:1,unit:"نوبت"},
] as const;
export const CARE_PACKS = [
  {id:"morning",title:"شروع آرام روز",description:"اولویت روز، فاصله از صفحه و حرکت طبق برنامهٔ خودت",items:["plan","screen","stretch"]},
  {id:"evening",title:"جمع‌بندی شب",description:"یادداشت، محیط مرتب و آماده‌شدن برای خواب",items:["journal","space","sleep"]},
  {id:"body",title:"مراقبت شخصی",description:"یک نقطهٔ شروع قابل ویرایش برای مراقبت خودت",items:["cleanser","moisturizer","hair"]},
  {id:"mind",title:"ذهن و ارتباط",description:"آرامش، گفت‌وگو و فرصتی برای نوشتن",items:["tea","connection","journal"]},
];
export function scheduledOn(weekdays:string,date:string) {try{const days=JSON.parse(weekdays);return Array.isArray(days)&&days.includes(new Date(date+"T12:00:00Z").getUTCDay());}catch{return false;}}
export function careWeek(logs:{date:string;value:number;targetValue:number}[],end:string) {return Array.from({length:7},(_,index)=>{const date=addDays(end,index-6);const rows=logs.filter(log=>log.date===date);return {date,completed:rows.filter(log=>log.value>=log.targetValue).length,recorded:rows.length};});}
