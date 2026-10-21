"use client";
import { useEffect, useState, useCallback } from "react";
import moment from "jalali-moment";
import { Header } from "@/components/layout/header";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/confirm-dialog";
import { useRecordsRefresh } from "@/components/use-records-refresh";
import { toISODate, formatJalaliDate, getJalaliMonthName, jalaliToDate } from "@/lib/format";
import { addDays, cycleSummary, daysBetween, type Period } from "@/lib/cycle-tracking";
import { ChevronLeft, ChevronRight, Plus, Pencil, Archive, RotateCcw, CalendarHeart, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
const SYMPTOMS: Record<string,string> = { cramps:"گرفتگی",bloating:"نفخ",headache:"سردرد",fatigue:"خستگی",mood:"نوسان خلق",cravings:"هوس غذایی",back_pain:"کمردرد",acne:"جوش",breast_tenderness:"حساسیت سینه",sleep:"تغییر خواب",digestion:"تغییر گوارش",dizziness:"سرگیجه" };
const FLOWS: Record<string,string> = {none:"بدون خون‌ریزی",spotting:"لکه‌بینی",light:"کم",medium:"متوسط",heavy:"زیاد"};
const MOODS: Record<string,string> = {great:"عالی",good:"خوب",neutral:"معمولی",tired:"خسته",bad:"گرفته"};
type Daily = {date:string;flow:string;pain:number;mood:string;symptoms:string;notes:string|null};
type Form = Omit<Daily,"symptoms"> & {symptoms:string[]};
type Data = {periods:Period[];archivedPeriods:Period[];daily:Daily[];entries:{id:string;date:string;symptoms:string|null;flow:string|null;notes:string|null}[];settings:{avgCycleLength:number;avgPeriodLength:number}};
const parseSymptoms = (raw:string|null) => { try { const value = JSON.parse(raw ?? "[]"); return Array.isArray(value) ? value.filter(v => typeof v === "string") as string[] : []; } catch { return []; } };
function savedDay(data:Data|null,date:string):Form {
  const row = data?.daily.find(row => row.date === date);
  if(row) return {...row,symptoms:parseSymptoms(row.symptoms)};
  const legacy = data?.entries.filter(row => row.date === date) ?? [];
  return {date,flow:legacy.find(row => row.flow)?.flow ?? "none",pain:0,mood:"neutral",symptoms:[...new Set(legacy.flatMap(row => parseSymptoms(row.symptoms)))],notes:legacy.map(row => row.notes).filter(Boolean).join("\n")};
}
export default function CyclePage() {
  const today = toISODate(new Date());
  const [date,setDate] = useState(today);
  const [month,setMonth] = useState(() => ({year:moment().jYear(),month:moment().jMonth()+1}));
  const [data,setData] = useState<Data|null>(null);
  const [error,setError] = useState(false);
  const [pending,setPending] = useState(false);
  const [draft,setDraft] = useState<Form|null>(null);
  const [periodOpen,setPeriodOpen] = useState(false);
  const [periodForm,setPeriodForm] = useState({id:"",startDate:today,endDate:"",notes:""});
  const [lengths,setLengths] = useState({avgCycleLength:28,avgPeriodLength:5});
  const confirm = useConfirm();
  const form = draft?.date === date ? draft : savedDay(data,date);
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(savedDay(data,date));
  const summary = cycleSummary(data?.periods ?? [],today,data?.settings.avgCycleLength ?? 28);
  const load = useCallback(async (signal?:AbortSignal) => {
    try { const r = await fetch(`/api/cycle?today=${today}`,{signal}); if(!r.ok) throw new Error(); const next = await r.json(); setData(next);setLengths(next.settings);setError(false); }
    catch { if(!signal?.aborted) {setError(true);toast.error("دریافت اطلاعات چرخه انجام نشد");} }
  },[today]);
  useRecordsRefresh(() => {void load();});
  useEffect(() => {
    const controller=new AbortController();
    fetch(`/api/cycle?today=${today}`,{signal:controller.signal}).then(response=>{if(!response.ok)throw new Error();return response.json();}).then(next=>{setData(next);setLengths(next.settings);setError(false);}).catch(()=>{if(!controller.signal.aborted){setError(true);toast.error("دریافت اطلاعات چرخه انجام نشد");}});
    return()=>controller.abort();
  },[today]);
  useEffect(() => {if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
  const changeDay = async (day:string) => {if(dirty&&!await confirm({title:"یادداشت این روز ذخیره نشده",description:"تغییر روز، نوشتهٔ ذخیره‌نشده را کنار می‌گذارد.",confirmLabel:"تغییر روز",destructive:false}))return;setDate(day);setDraft(null);const m=moment(day);setMonth({year:m.jYear(),month:m.jMonth()+1});};
  const request = async (path:string,method:string,body:unknown) => {const r=await fetch(path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw new Error(result.error??"ذخیره انجام نشد");return result;};
  const saveDaily = async () => {setPending(true);try{await request("/api/cycle","POST",{action:"daily",...form});await load();setDraft(null);toast.success("جزئیات این روز ذخیره شد");}catch(err){toast.error(err instanceof Error?err.message:"خطا");}finally{setPending(false);}};
  const editPeriod = (period?:Period) => {setPeriodForm({id:period?.id??"",startDate:period?.startDate??date,endDate:period?.endDate??"",notes:period?.notes??""});setPeriodOpen(true);};
  const savePeriod = async (event:React.FormEvent) => {event.preventDefault();setPending(true);try{await request("/api/cycle/periods","POST",{...periodForm,id:periodForm.id||undefined,endDate:periodForm.endDate||null});setPeriodOpen(false);await load();toast.success("دوره ذخیره شد");}catch(err){toast.error(err instanceof Error?err.message:"خطا");}finally{setPending(false);}};
  const archivePeriod = async (period:Period,archived:boolean) => {if(archived&&!await confirm({title:"این دوره از تقویم کنار گذاشته شود؟",description:"داده حذف نمی‌شود؛ از بخش دوره‌های بایگانی‌شده قابل بازیابی است.",confirmLabel:"بایگانی",destructive:false}))return;setPending(true);try{await request("/api/cycle/periods","PATCH",{id:period.id,archived});await load();toast.success(archived?"دوره بایگانی شد":"دوره بازیابی شد");}catch(err){toast.error(err instanceof Error?err.message:"خطا");}finally{setPending(false);}};
  const moveMonth=(delta:number)=>setMonth(previous=>{const d=moment(jalaliToDate(previous.year,previous.month,1)).add(delta,"jMonth");return{year:d.jYear(),month:d.jMonth()+1};});
  const count=moment().jYear(month.year).jMonth(month.month-1).jDaysInMonth();
  const offset=(jalaliToDate(month.year,month.month,1).getDay()+1)%7;
  const cells=Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>{const day=i-offset+1;return day<1||day>count?null:{number:day,date:toISODate(jalaliToDate(month.year,month.month,day))};});
  const symptoms=Object.entries(SYMPTOMS).map(([id,label])=>({id,label,count:(data?.daily??[]).filter(row=>parseSymptoms(row.symptoms).includes(id)).length})).filter(item=>item.count>0).sort((a,b)=>b.count-a.count);
  return <><Header title="چرخه و تقویم شخصی"/><div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8"><PageHero heroKey="cycle" title="یک تقویم، تمام سابقهٔ چرخه" subtitle="ثبت بازهٔ دوره، جزئیات روزانه، مرور تاریخچه و برآورد بر پایهٔ سوابق خودت"/>
    {error&&<div role="alert" className="rounded-xl border p-4 text-sm">اطلاعات به‌روز نشده است. <Button variant="outline" onClick={()=>void load()}>تلاش دوباره</Button></div>}
    {!data&&!error&&<p role="status" className="p-5 text-sm">در حال دریافت تقویم…</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      ["روز چرخه",summary.cycleDay?`روز ${summary.cycleDay.toLocaleString("fa-IR")}`:"هنوز شروعی ثبت نشده"],
      ["فاصلهٔ شروع‌ها",`${summary.average.toLocaleString("fa-IR")} روز · ${summary.intervals.length?"از سوابق ثبت‌شده":"تنظیم دستی"}`],
      ["میانگین طول دوره",summary.averagePeriod?`${summary.averagePeriod.toLocaleString("fa-IR")} روز`:"پس از ثبت پایان دوره"],
      ["شروع بعدی · تقریبی",summary.nextEstimate?formatJalaliDate(summary.nextEstimate+"T12:00:00"):"پس از ثبت شروع"],
    ].map(([label,value])=><Card key={label} className="gap-2 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-bold leading-7">{value}</p></Card>)}</div>
    <div className="grid items-start gap-5 lg:grid-cols-[1.05fr_1fr]"><Card className="space-y-5 p-4 sm:p-6"><div className="flex items-center justify-between"><Button aria-label="ماه قبل" variant="outline" size="icon" onClick={()=>moveMonth(-1)}><ChevronRight className="h-4 w-4"/></Button><h2 className="font-bold">{getJalaliMonthName(month.month)} {month.year.toLocaleString("fa-IR",{useGrouping:false})}</h2><Button aria-label="ماه بعد" variant="outline" size="icon" onClick={()=>moveMonth(1)}><ChevronLeft className="h-4 w-4"/></Button></div>
      <div className="grid grid-cols-7 gap-1.5 text-center">{["ش","ی","د","س","چ","پ","ج"].map((day,index)=><span key={index} className="py-2 text-xs text-muted-foreground">{day}</span>)}{cells.map((cell,index)=>{
        if(!cell)return<span key={`empty${index}`}/>;
        const actual=data?.periods.some(period=>cell.date>=period.startDate&&cell.date<=(period.endDate??(period.id===summary.ongoing?.id?today:period.startDate)));
        const estimate=!actual&&summary.estimateFrom&&summary.estimateTo&&cell.date>=summary.estimateFrom&&cell.date<=addDays(summary.estimateTo,(data?.settings.avgPeriodLength??5)-1);
        const logged=data?.daily.some(row=>row.date===cell.date)||data?.entries.some(row=>row.date===cell.date);
        return<button key={cell.date} type="button" disabled={pending||!data} aria-label={formatJalaliDate(cell.date+"T12:00:00")+(actual?"، دوره ثبت‌شده":"")+(logged?"، دارای یادداشت":"")} aria-pressed={date===cell.date} onClick={()=>void changeDay(cell.date)} className={cn("relative flex min-h-11 flex-col items-center justify-center rounded-xl border text-sm transition-colors",actual?"border-rose-400/50 bg-rose-500/15 text-rose-800 dark:text-rose-200":estimate?"border-dashed border-primary/40 bg-primary/5":"border-transparent hover:bg-muted",date===cell.date&&"ring-2 ring-primary ring-offset-2 ring-offset-card",cell.date===today&&"font-black underline underline-offset-4")}><span>{cell.number.toLocaleString("fa-IR")}</span>{logged&&<span className="absolute bottom-1 h-1 w-1 rounded-full bg-current"/>}</button>;
      })}</div><div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground"><span>🩷 دورهٔ ثبت‌شده</span><span>◌ بازهٔ تقریبی</span><span>• جزئیات روزانه</span></div>
      <div className="flex flex-wrap gap-2"><Button disabled={!data||pending} onClick={()=>editPeriod()}><Plus className="h-4 w-4"/> ثبت دوره / تاریخ گذشته</Button>{summary.ongoing&&<Button variant="outline" disabled={pending} onClick={()=>{editPeriod(summary.ongoing!);setPeriodForm(previous=>({...previous,endDate:date>=previous.startDate?date:today}));}}>ثبت پایان دورهٔ جاری</Button>}<Button variant="ghost" onClick={()=>void changeDay(today)}>امروز</Button></div>
      <p className="rounded-xl bg-muted/50 p-3 text-xs leading-7 text-muted-foreground">برآورد فقط از فاصلهٔ شروع‌های ثبت‌شده محاسبه می‌شود؛ شروع جدید خودکار فرض نمی‌شود و این تقویم روز تخمک‌گذاری یا روش پیشگیری تعیین نمی‌کند.{summary.estimateFrom&&summary.estimateTo&&summary.estimateFrom!==summary.estimateTo&&` بازهٔ سوابق اخیر: ${formatJalaliDate(summary.estimateFrom+"T12:00:00")} تا ${formatJalaliDate(summary.estimateTo+"T12:00:00")}.`}</p>
    </Card>
    <Card className="space-y-4 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">جزئیات {formatJalaliDate(date+"T12:00:00")}</h2><Input aria-label="روز ثبت جزئیات" type="date" max={today} value={date} disabled={pending} onChange={event=>event.target.value&&void changeDay(event.target.value)} className="w-auto"/></div><fieldset disabled={pending||!data} className="min-w-0 space-y-5"><div><p className="mb-2 text-sm font-medium">خون‌ریزی این روز</p><div className="flex flex-wrap gap-2">{Object.entries(FLOWS).map(([value,label])=><Button type="button" key={value} size="sm" variant={form.flow===value?"default":"outline"} aria-pressed={form.flow===value} onClick={()=>setDraft({...form,flow:value})}>{label}</Button>)}</div></div>
      <label className="block space-y-2"><span className="flex justify-between text-sm"><span>شدت درد ثبت‌شده</span><strong>{form.pain.toLocaleString("fa-IR")} از ۱۰</strong></span><input type="range" aria-label="شدت درد" min={0} max={10} step={1} value={form.pain} onChange={event=>setDraft({...form,pain:Number(event.target.value)})} className="w-full accent-[var(--primary)]"/></label>
      <label className="block space-y-2 text-sm">حال روز<select aria-label="حال روز" value={form.mood} onChange={event=>setDraft({...form,mood:event.target.value})} className="h-11 w-full rounded-lg border bg-background px-3">{Object.entries(MOODS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <div><p className="mb-2 text-sm font-medium">نشانه‌های این روز</p><div className="flex flex-wrap gap-2">{Object.entries(SYMPTOMS).map(([id,label])=><button type="button" key={id} aria-pressed={form.symptoms.includes(id)} onClick={()=>setDraft({...form,symptoms:form.symptoms.includes(id)?form.symptoms.filter(value=>value!==id):[...form.symptoms,id]})} className={cn("min-h-10 rounded-full border px-3 text-xs",form.symptoms.includes(id)&&"border-primary bg-primary/10 text-primary")}>{label}</button>)}</div></div>
      <label className="block space-y-2 text-sm">یادداشت<Textarea value={form.notes??""} maxLength={20000} rows={4} onChange={event=>setDraft({...form,notes:event.target.value})} placeholder="جزئیاتی که می‌خواهی در مرور بعدی به خاطر بیاوری…"/></label>
      <div className="flex items-center justify-between gap-3"><Button disabled={pending||!data} onClick={()=>void saveDaily()}><Save className="h-4 w-4"/>{pending?"در حال ذخیره…":"ذخیرهٔ همین روز"}</Button><span className="text-xs text-muted-foreground">{dirty?"تغییر ذخیره‌نشده":data?.daily.some(row=>row.date===date)?"این روز ثبت شده است":"ثبت مستقل از شروع و پایان دوره"}</span></div></fieldset>
    </Card></div>
    <div className="grid items-start gap-5 lg:grid-cols-2"><Card className="space-y-4 p-5"><h2 className="flex items-center gap-2 font-bold"><CalendarHeart className="h-5 w-5"/> تاریخچهٔ دوره‌ها</h2>{data?.periods.length?data.periods.map((period,index)=><div key={period.id} className="space-y-2 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{formatJalaliDate(period.startDate+"T12:00:00")} ← {period.endDate?formatJalaliDate(period.endDate+"T12:00:00"):period.id===summary.ongoing?.id?"پایان هنوز ثبت نشده":"پایان نامشخص"}</strong><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="ویرایش دوره" disabled={pending} onClick={()=>editPeriod(period)}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label="بایگانی دوره" disabled={pending} onClick={()=>void archivePeriod(period,true)}><Archive className="h-4 w-4"/></Button></div></div><p className="text-xs text-muted-foreground">{period.endDate?`${daysBetween(period.startDate,period.endDate)+1} روز ثبت‌شده`:"برای محاسبهٔ طول دوره، تاریخ پایان را وارد کن"}{index>0?` · فاصله تا شروع بعد: ${daysBetween(period.startDate,data.periods[index-1].startDate)} روز`:""}</p>{period.notes&&<p className="whitespace-pre-wrap text-sm leading-7">{period.notes}</p>}</div>):<p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">از یک دورهٔ گذشته با تاریخ شروع و پایان معلوم شروع کن؛ ثبت‌های قبلی نیز حفظ می‌شوند.</p>}
      {!!data?.archivedPeriods.length&&<details><summary className="cursor-pointer text-xs text-muted-foreground">دوره‌های بایگانی‌شده ({data.archivedPeriods.length})</summary><div className="mt-3 space-y-2">{data.archivedPeriods.map(period=><div key={period.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><span className="text-sm">{formatJalaliDate(period.startDate+"T12:00:00")}</span><Button size="sm" variant="outline" disabled={pending} onClick={()=>void archivePeriod(period,false)}><RotateCcw className="h-4 w-4"/> بازیابی</Button></div>)}</div></details>}
    </Card><div className="space-y-5"><Card className="space-y-4 p-5"><h2 className="font-bold">الگوهای ثبت‌شدهٔ خودت</h2><p className="text-xs leading-7 text-muted-foreground">فراوانی نشانه‌ها در {data?.daily.length??0} روز ثبت روزانه؛ این شمارش توصیفی است.</p>{symptoms.length?symptoms.slice(0,6).map(item=><div key={item.id} className="flex items-center gap-3 text-xs"><span className="w-24">{item.label}</span><progress max={data?.daily.length??1} value={item.count} className="h-2 flex-1 accent-[var(--primary)]"/><span>{item.count.toLocaleString("fa-IR")} روز</span></div>):<p className="text-sm text-muted-foreground">با ثبت جزئیات چند روز، الگوهای شخصی‌ات اینجا دیده می‌شوند.</p>}<div className="max-h-64 space-y-2 overflow-y-auto">{data?.daily.slice(0,12).map(row=><button key={row.date} type="button" onClick={()=>void changeDay(row.date)} className="flex w-full justify-between gap-3 rounded-xl border p-3 text-right text-xs hover:bg-muted"><span>{formatJalaliDate(row.date+"T12:00:00")}</span><span>{FLOWS[row.flow]} · درد {row.pain.toLocaleString("fa-IR")}/۱۰</span></button>)}</div></Card>
    <Card className="space-y-4 p-5"><h2 className="font-bold">پایهٔ برآورد تقویم</h2><p className="text-xs leading-7 text-muted-foreground">تا وقتی فاصلهٔ کافی از شروع‌های قبلی ثبت نکرده‌ای، مقدار دستی مبناست. با ثبت سوابق، میانگین آخرین شش فاصله استفاده می‌شود.</p><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-2 text-sm">فاصلهٔ شروع‌ها (روز)<Input type="number" min={20} max={45} value={lengths.avgCycleLength} onChange={event=>setLengths({...lengths,avgCycleLength:Number(event.target.value)})}/></label><label className="space-y-2 text-sm">طول نمایش تقریبی (روز)<Input type="number" min={2} max={12} value={lengths.avgPeriodLength} onChange={event=>setLengths({...lengths,avgPeriodLength:Number(event.target.value)})}/></label></div><Button variant="outline" disabled={pending||!data} onClick={async()=>{setPending(true);try{await request("/api/cycle","PATCH",lengths);await load();toast.success("تنظیمات ذخیره شد");}catch(err){toast.error(err instanceof Error?err.message:"خطا");}finally{setPending(false);}}}>ذخیرهٔ تنظیمات تقویم</Button></Card></div></div>
    <Dialog open={periodOpen} onOpenChange={next=>{if(!pending)setPeriodOpen(next);}}><DialogContent className="sm:max-w-md" dir="rtl"><DialogHeader><DialogTitle>{periodForm.id?"ویرایش دوره":"ثبت یک دوره"}</DialogTitle></DialogHeader><form onSubmit={savePeriod} className="space-y-4"><label className="block space-y-2 text-sm">تاریخ شروع<Input type="date" aria-label="تاریخ شروع دوره" required max={today} value={periodForm.startDate} onChange={event=>setPeriodForm({...periodForm,startDate:event.target.value})}/></label><label className="block space-y-2 text-sm">تاریخ پایان (در صورت پایان دوره)<Input type="date" aria-label="تاریخ پایان دوره" min={periodForm.startDate} max={today} value={periodForm.endDate} onChange={event=>setPeriodForm({...periodForm,endDate:event.target.value})}/></label><p className="text-xs leading-6 text-muted-foreground">برای دورهٔ جاری، پایان را خالی بگذار؛ بعداً می‌توانی آن را ثبت کنی.</p><label className="block space-y-2 text-sm">یادداشت دوره<Textarea value={periodForm.notes} maxLength={20000} onChange={event=>setPeriodForm({...periodForm,notes:event.target.value})}/></label><Button type="submit" disabled={pending}>{pending?"در حال ذخیره…":"ذخیرهٔ دوره"}</Button></form></DialogContent></Dialog>
  </div></>;
}
