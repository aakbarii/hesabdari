/** Admin UI catalog: Persian labels, groups, and preferred columns for each table. */

export type AdminSectionId =
  | "finance"
  | "health"
  | "life"
  | "growth"
  | "social"
  | "system";

export const ADMIN_SECTIONS: {
  id: AdminSectionId;
  label: string;
  hint: string;
}[] = [
  { id: "finance", label: "مالی", hint: "حساب، تراکنش، بودجه، بدهی، هدف، دارایی" },
  { id: "health", label: "سلامت", hint: "خواب، دارو، تغذیه، ورزش، سیکل، مراقبت" },
  { id: "life", label: "زندگی", hint: "تسک، روتین، عادت، تمرکز، سفر، خودرو" },
  { id: "growth", label: "رشد", hint: "کتاب، دوره، ژورنال، بینش" },
  { id: "social", label: "گروه", hint: "گروه، خرید، تسک مشترک، تنخواه" },
  { id: "system", label: "سیستم", hint: "تنظیمات، قوانین دسته، فایل، پیامک بانکی" },
];

export type AdminTableMeta = {
  key: string;
  label: string;
  section: AdminSectionId;
  /** Columns to surface first in the pretty table (rest still in expand). */
  columns: string[];
};

export const ADMIN_TABLE_META: AdminTableMeta[] = [
  { key: "accounts", label: "حساب‌ها", section: "finance", columns: ["name", "type", "initialBalance", "color"] },
  { key: "categories", label: "دسته‌ها", section: "finance", columns: ["name", "type", "color"] },
  { key: "transactions", label: "تراکنش‌ها", section: "finance", columns: ["type", "amount", "description", "date", "accountId", "categoryId"] },
  { key: "transfers", label: "انتقال‌ها", section: "finance", columns: ["amount", "fromAccountId", "toAccountId", "description", "date"] },
  { key: "budgets", label: "بودجه‌ها", section: "finance", columns: ["categoryId", "year", "month", "amount"] },
  { key: "debts", label: "بدهی و طلب", section: "finance", columns: ["personName", "type", "totalAmount", "paidAmount", "status", "dueDate"] },
  { key: "debtPayments", label: "پرداخت بدهی", section: "finance", columns: ["debtId", "amount", "date", "note"] },
  { key: "goals", label: "اهداف", section: "finance", columns: ["name", "type", "targetAmount", "currentAmount", "status", "deadline"] },
  { key: "goalContributions", label: "واریز هدف", section: "finance", columns: ["goalId", "amount", "date", "note"] },
  { key: "assets", label: "دارایی‌ها", section: "finance", columns: ["name", "type", "quantity", "unitPrice", "purchasePrice"] },
  { key: "assetPriceHistory", label: "تاریخچه قیمت", section: "finance", columns: ["assetId", "unitPrice", "recordedAt"] },
  { key: "recurringTransactions", label: "تراکنش تکراری", section: "finance", columns: ["description", "type", "amount", "frequency", "nextRunDate", "isActive"] },
  { key: "pendingBankImports", label: "پیامک بانکی در انتظار", section: "finance", columns: ["suggestedAmount", "suggestedType", "suggestedTitle", "suggestedDate", "status", "sender"] },

  { key: "sleepLogs", label: "خواب", section: "health", columns: ["date", "hours", "quality", "energy", "bedtime", "wakeTime"] },
  { key: "medications", label: "داروها", section: "health", columns: ["name", "dose", "schedule", "reminderHour", "active"] },
  { key: "medicationLogs", label: "لاگ دارو", section: "health", columns: ["medicationId", "date", "taken"] },
  { key: "meals", label: "وعده‌ها", section: "health", columns: ["date", "mealType", "name", "calories", "protein", "carbs", "fat"] },
  { key: "waterLogs", label: "آب", section: "health", columns: ["date", "amountMl"] },
  { key: "workouts", label: "تمرین", section: "health", columns: ["date", "title", "type", "durationMinutes", "caloriesBurned"] },
  { key: "bodyMetrics", label: "وزن و آنتروپومتری", section: "health", columns: ["date", "weightKg", "bodyFat", "note"] },
  { key: "vehicleServices", label: "سرویس خودرو", section: "health", columns: ["vehicleName", "serviceType", "currentMileage", "nextDueMileage", "serviceDate", "nextDueDate", "cost"] },
  { key: "cycleSettings", label: "تنظیمات سیکل", section: "health", columns: ["avgCycleLength", "avgPeriodLength", "updatedAt"] },
  { key: "cycleEntries", label: "ثبت سیکل", section: "health", columns: ["date", "kind", "flow", "symptoms", "notes"] },
  { key: "periodRecords", label: "دوره‌های پریود", section: "health", columns: ["startDate", "endDate", "notes", "archived"] },
  { key: "cycleDailyLogs", label: "لاگ روزانه سیکل", section: "health", columns: ["date", "flow", "pain", "mood", "symptoms"] },
  { key: "selfCareItems", label: "آیتم مراقبت", section: "health", columns: ["title", "category", "timeOfDay", "weekdays"] },
  { key: "selfCareLogs", label: "لاگ مراقبت", section: "health", columns: ["itemId", "date", "value", "targetValue", "titleSnapshot", "unitSnapshot"] },

  { key: "todos", label: "تسک‌ها", section: "life", columns: ["title", "area", "priority", "status", "dueDate", "checklist"] },
  { key: "routines", label: "روتین‌ها", section: "life", columns: ["name", "frequency", "timeOfDay", "weeklyDays", "active"] },
  { key: "routineCompletions", label: "تکمیل روتین", section: "life", columns: ["routineId", "date"] },
  { key: "habits", label: "عادت‌ها", section: "life", columns: ["title", "cue", "timeOfDay", "color", "active"] },
  { key: "habitCompletions", label: "تکمیل عادت", section: "life", columns: ["habitId", "date"] },
  { key: "focusSessions", label: "جلسات تمرکز", section: "life", columns: ["date", "taskName", "durationMinutes", "category", "todoId"] },
  { key: "trips", label: "سفرها", section: "life", columns: ["title", "place", "startDate", "endDate", "budget"] },
  { key: "tripExpenses", label: "هزینه سفر", section: "life", columns: ["tripId", "title", "amount", "category", "date"] },

  { key: "books", label: "کتاب‌ها", section: "growth", columns: ["title", "author", "status", "totalPages", "currentPage", "rating"] },
  { key: "courses", label: "دوره‌ها", section: "growth", columns: ["title", "platform", "status", "totalLessons", "completedLessons"] },
  { key: "dailyJournals", label: "ژورنال", section: "growth", columns: ["date", "mood", "gratitude", "highlights", "notes"] },
  { key: "weeklyInsights", label: "بینش هفتگی", section: "growth", columns: ["weekStart", "locale", "content", "suggestionsJson"] },

  { key: "groups", label: "گروه‌ها (مالک)", section: "social", columns: ["name", "inviteCode", "createdAt"] },
  { key: "groupMemberships", label: "عضویت در گروه", section: "social", columns: ["groupId", "role", "joinedAt"] },
  { key: "groupMoodShares", label: "اشتراک حال", section: "social", columns: ["groupId", "mood", "note", "date"] },
  { key: "groupShoppingItems", label: "خرید گروهی", section: "social", columns: ["groupId", "title", "qty", "done", "createdBy"] },
  { key: "groupTasks", label: "تسک گروهی", section: "social", columns: ["groupId", "title", "done", "assigneeName", "createdBy"] },
  { key: "groupExpenses", label: "هزینه گروهی", section: "social", columns: ["groupId", "title", "amount", "category", "date", "createdBy"] },
  { key: "groupPettyCash", label: "تنخواه", section: "social", columns: ["groupId", "title", "year", "month", "monthlyBudget", "managerUserId"] },
  { key: "groupPettyCashItems", label: "اقلام تنخواه", section: "social", columns: ["pettyCashId", "title", "amount", "date", "notes"] },

  { key: "userSettings", label: "تنظیمات", section: "system", columns: ["currencyUnit", "locale", "gender", "appearanceMood", "accentColor", "onboardingCompleted", "healthTargets"] },
  { key: "categoryRules", label: "قوانین دسته", section: "system", columns: ["keyword", "categoryId"] },
  { key: "receiptFiles", label: "فایل‌ها / رسید", section: "system", columns: ["id", "mimeType", "createdAt"] },
];

export const ADMIN_TABLE_BY_KEY = Object.fromEntries(
  ADMIN_TABLE_META.map((m) => [m.key, m])
) as Record<string, AdminTableMeta>;
