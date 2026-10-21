import { z } from "zod";
import { dateInput } from "./validation";
export type Field = { key: string; label: string; kind?: "number" | "date" | "text" | "select" | "note"; nullable?: boolean; min?: number; max?: number; integer?: boolean; options?: Record<string, string>; timestamp?: boolean };
export type Resource = { label: string; module: string; title: string; fields: Field[]; deletePath?: string; readonly?: boolean };
const text = (key: string, label: string): Field => ({ key, label });
const note = (key = "notes", label = "یادداشت"): Field => ({ key, label, kind: "note", nullable: true });
const num = (key: string, label: string, min = 0, max = 1e12): Field => ({ key, label, kind: "number", min, max, integer: true });
const day = (key = "date", label = "تاریخ", timestamp = false, nullable = false): Field => ({ key, label, kind: "date", timestamp, nullable });
const select = (key: string, label: string, options: Record<string, string>): Field => ({ key, label, kind: "select", options });
export const RESOURCES: Record<string, Resource> = {
  books: { module: "growth", label: "کتاب‌ها", title: "title", fields: [text("title", "عنوان"), text("author", "نویسنده"), num("totalPages", "کل صفحات", 1, 100000), num("currentPage", "صفحه فعلی", 0, 100000), select("status", "وضعیت", { want_to_read: "برای بعد", reading: "در حال مطالعه", completed: "تمام‌شده" }), { ...num("rating", "امتیاز از ۵", 1, 5), nullable: true }, text("category", "موضوع"), note()] },
  courses: { module: "growth", label: "دوره‌ها", title: "title", fields: [text("title", "عنوان"), text("platform", "منبع یا مدرس"), num("totalLessons", "کل جلسات", 1, 100000), num("completedLessons", "جلسات کامل‌شده", 0, 100000), select("status", "وضعیت", { in_progress: "در حال یادگیری", completed: "تمام‌شده" }), note()] },
  workouts: { module: "fitness", label: "تمرین‌ها", title: "title", fields: [text("title", "عنوان"), select("type", "نوع", { strength: "قدرتی", cardio: "هوازی", walk: "پیاده‌روی", flexibility: "انعطاف", other: "سایر" }), num("durationMinutes", "مدت (دقیقه)", 1, 1440), num("caloriesBurned", "انرژی ثبت‌شده", 0, 20000), day(), note()] },
  bodyMetrics: { module: "fitness", label: "اندازه‌گیری بدن", title: "date", fields: [day(), { ...num("weightKg", "وزن (کیلوگرم)", .1, 1000), integer: false }, { ...num("bodyFat", "درصد چربی", 0, 100), nullable: true, integer: false }, note("note")] },
  meals: { module: "nutrition", label: "وعده‌ها", title: "name", fields: [text("name", "نام غذا"), select("mealType", "وعده", { breakfast: "صبحانه", lunch: "ناهار", dinner: "شام", snack: "میان‌وعده" }), day(), num("calories", "کالری", 0, 20000), num("protein", "پروتئین (گرم)", 0, 2000), num("carbs", "کربوهیدرات (گرم)", 0, 3000), num("fat", "چربی (گرم)", 0, 2000), note("note")] },
  waterLogs: { module: "nutrition", label: "آب", title: "date", fields: [day(), num("amountMl", "مقدار ثبت‌شده (میلی‌لیتر)", 1, 20000)] },
  focusSessions: { module: "focus", label: "جلسات تمرکز", title: "taskName", fields: [text("taskName", "موضوع"), num("durationMinutes", "مدت (دقیقه)", 1, 240), select("category", "دسته", { work: "کار", study: "مطالعه", coding: "برنامه‌نویسی", personal: "شخصی" }), day()] },
  dailyJournals: { module: "journal", label: "ژورنال‌ها", title: "date", fields: [day(), select("mood", "حال روز", { great: "عالی", good: "خوب", neutral: "معمولی", tired: "خسته", bad: "گرفته" }), note("gratitude", "شکرگزاری"), note("highlights", "دستاوردها"), note()] },
  vehicleServices: { module: "maintenance", label: "سرویس‌ها", title: "vehicleName", fields: [text("vehicleName", "خودرو"), select("serviceType", "نوع سرویس", { oil_change: "روغن", filter: "فیلتر", brake_pads: "لنت", insurance: "بیمه", inspection: "معاینه", tires: "لاستیک", other: "سایر" }), num("currentMileage", "کیلومتر فعلی"), { ...num("nextDueMileage", "کیلومتر بعدی"), nullable: true }, day("serviceDate", "تاریخ سرویس"), day("nextDueDate", "موعد بعد", false, true), num("cost", "هزینه (تومان)"), note()] },
  sleepLogs: { module: "sleep", label: "سوابق خواب", title: "date", fields: [day(), { ...num("hours", "مدت (ساعت)", 0, 24), nullable: true, integer: false }, num("quality", "کیفیت از ۵", 1, 5), num("energy", "انرژی از ۵", 1, 5), note()] },
  medications: { module: "meds", label: "داروهای ثبت‌شده", title: "name", fields: [text("name", "نام"), note("dose", "مقدار طبق دستور خودت"), select("schedule", "برنامه ثبت‌شده", { daily: "روزانه", twice_daily: "دو بار در روز", as_needed: "در صورت نیاز", weekly: "هفتگی" }), num("reminderHour", "ساعت یادآوری", 0, 23), note()] },
  trips: { module: "travel", label: "سفرها", title: "title", fields: [text("title", "نام سفر"), note("place", "مقصد"), day("startDate", "شروع"), day("endDate", "پایان", false, true), num("budget", "بودجه (تومان)"), note()], deletePath: "/api/travel?id=" },
  tripExpenses: { module: "travel", label: "هزینه‌های سفر", title: "title", fields: [text("title", "عنوان"), num("amount", "مبلغ (تومان)"), text("category", "دسته"), day()] },
  cycleEntries: { module: "cycle", label: "سوابق چرخه", title: "date", fields: [day(), select("kind", "نوع ثبت", { period_start: "شروع", period_end: "پایان", symptom: "نشانه", note: "یادداشت" }), note()] },
  habits: { module: "habits", label: "عادت‌ها", title: "title", fields: [text("title", "عنوان")], deletePath: "/api/habits?id=" },
  todos: { module: "life", label: "کارها", title: "title", fields: [text("title", "عنوان"), note("description", "توضیحات"), select("priority", "اولویت", { low: "کم", medium: "متوسط", high: "زیاد" }), select("status", "وضعیت", { active: "باز", done: "انجام‌شده" }), day("dueDate", "موعد", true, true)], deletePath: "/api/todos/" },
  routines: { module: "life", label: "روتین‌ها", title: "name", fields: [text("name", "نام"), note("description", "توضیحات")], deletePath: "/api/routines/" },
  transactions: { module: "transactions", label: "تراکنش‌ها", title: "description", fields: [note("description", "توضیحات"), day("date", "تاریخ", true)], deletePath: "/api/transactions/" },
  accounts: { module: "accounts", label: "حساب‌ها", title: "name", fields: [text("name", "نام حساب")], deletePath: "/api/accounts/" },
  budgets: { module: "budget", label: "بودجه‌ها", title: "amount", fields: [num("amount", "بودجه (تومان)", 1)], deletePath: "/api/budgets/" },
  debts: { module: "debts", label: "بدهی و طلب", title: "personName", fields: [text("personName", "طرف حساب"), note("description", "توضیحات"), day("dueDate", "موعد", true, true)], deletePath: "/api/debts/" },
  goals: { module: "goals", label: "هدف‌ها", title: "name", fields: [text("name", "عنوان"), day("deadline", "موعد", true, true)], deletePath: "/api/goals/" },
  assets: { module: "assets", label: "دارایی‌ها", title: "name", fields: [text("name", "نام")], deletePath: "/api/assets/" },
};
export function validateRecordPatch(resource: string, value: unknown, existing: Record<string, unknown>) {
  const config = Object.hasOwn(RESOURCES, resource) ? RESOURCES[resource] : undefined;
  if (!config) throw new Error("بخش نامعتبر است");
  const shape: Record<string, z.ZodType> = {};
  for (const field of config.fields) {
    let validator: z.ZodType;
    if (field.kind === "number") { let number = z.number().min(field.min ?? 0).max(field.max ?? Number.MAX_SAFE_INTEGER); if (field.integer !== false) number = number.int(); validator = number; }
    else if (field.kind === "date") validator = dateInput.refine(v => /^\d{4}-\d{2}-\d{2}$/.test(v), "تاریخ نامعتبر");
    else if (field.kind === "select") validator = z.enum(Object.keys(field.options!) as [string, ...string[]]);
    else validator = z.string().trim().min(field.nullable ? 0 : 1).max(field.kind === "note" ? 20000 : 200);
    shape[field.key] = (field.nullable ? validator.nullable() : validator).optional();
  }
  const parsed = z.object(shape).strict().parse(value);
  if (!Object.keys(parsed).length) throw new Error("تغییری وارد نشده است");
  const merged = { ...existing, ...parsed };
  if (resource === "books" && Number(merged.currentPage) > Number(merged.totalPages)) throw new Error("صفحه فعلی نمی‌تواند از کل صفحات بیشتر باشد");
  if (resource === "courses" && Number(merged.completedLessons) > Number(merged.totalLessons)) throw new Error("جلسات انجام‌شده از کل جلسات بیشتر است");
  if (resource === "trips" && merged.endDate && String(merged.endDate) < String(merged.startDate)) throw new Error("پایان سفر پیش از شروع است");
  if (resource === "books") {
    if (parsed.status === "completed") parsed.currentPage = merged.totalPages;
    else if (parsed.currentPage !== undefined || parsed.totalPages !== undefined) parsed.status = merged.currentPage === merged.totalPages ? "completed" : (merged.status === "want_to_read" && !merged.currentPage ? "want_to_read" : "reading");
  }
  if (resource === "courses") {
    if (parsed.status === "completed") parsed.completedLessons = merged.totalLessons;
    else if (parsed.completedLessons !== undefined || parsed.totalLessons !== undefined) parsed.status = merged.completedLessons === merged.totalLessons ? "completed" : "in_progress";
  }
  for (const field of config.fields) if (field.timestamp && typeof parsed[field.key] === "string") parsed[field.key] = new Date(parsed[field.key] as string);
  return parsed;
}
export function csvCell(value: unknown) {
  const raw = String(value ?? "");
  return '"' + (/^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw).replaceAll('"', '""') + '"';
}
